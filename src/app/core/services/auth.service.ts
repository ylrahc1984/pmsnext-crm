import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, catchError, finalize, map, of, shareReplay, tap, throwError } from 'rxjs';
import {
  AuthUser,
  LoginRequest,
  LoginResponse,
  LogoutResponse,
  RefreshTokenRequest,
  RevokeAllSessionsResponse
} from '../models/auth.models';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly authBaseUrl = `${environment.apiUrl}/Login`;
  private readonly accessTokenKey = 'access_token';
  private readonly refreshTokenKey = 'refresh_token';
  private readonly userInfoKey = 'user_info';
  private readonly legacyAccessTokenKey = 'auth_token';
  private readonly legacyUserInfoKey = 'user_data';
  private readonly refreshLeadTimeMs = 60_000;
  private readonly refreshRetryDelayMs = 15_000;

  private refreshTimer: ReturnType<typeof setTimeout> | null = null;
  private refreshRequest$: Observable<LoginResponse> | null = null;
  private redirectInProgress = false;

  private currentUserSubject = new BehaviorSubject<AuthUser | null>(this.getUserFromStorage());
  public currentUser$ = this.currentUserSubject.asObservable();

  private isAuthenticatedSubject = new BehaviorSubject<boolean>(this.hasValidAccessToken());
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor() {
    this.restoreSession().subscribe({
      error: () => undefined
    });
  }

  /**
   * Realiza el login con usuario y contraseña
   */
  login(usuario: string, clave: string, modulo: string = 'admin', unidad: string = 'hestab'): Observable<LoginResponse> {
    const loginRequest: LoginRequest = {
      usuario,
      clave,
      modulo,
      unidad,
      respuesta: 'string'
    };

    return this.http.post<LoginResponse>(`${this.authBaseUrl}/login`, loginRequest).pipe(
      map((response) => this.normalizeResponse(response)),
      tap((response) => this.persistSession(response))
    );
  }

  /**
   * Restaura una sesión válida usando el access token actual o el refresh token.
   */
  restoreSession(): Observable<boolean> {
    const accessToken = this.getAccessToken();

    if (accessToken && !this.isTokenExpired(accessToken)) {
      this.isAuthenticatedSubject.next(true);
      this.scheduleTokenRefreshFromToken(accessToken);
      return of(true);
    }

    if (!this.hasRefreshToken()) {
      this.clearSession();
      return of(false);
    }

    return this.refreshAccessToken().pipe(
      map(() => true),
      catchError(() => {
        this.clearSession();
        return of(false);
      })
    );
  }

  /**
   * Obtiene un access token válido, renovándolo si es necesario.
   */
  getValidAccessToken(): Observable<string | null> {
    const accessToken = this.getAccessToken();

    if (accessToken && !this.isTokenExpired(accessToken)) {
      this.isAuthenticatedSubject.next(true);
      this.scheduleTokenRefreshFromToken(accessToken);
      return of(accessToken);
    }

    if (!this.hasRefreshToken()) {
      this.clearSession();
      return of(null);
    }

    return this.refreshAccessToken().pipe(
      map((response) => response.token),
      catchError(() => {
        this.clearSession();
        return of(null);
      })
    );
  }

  /**
   * Renueva el access token usando el refresh token rotativo.
   */
  refreshAccessToken(): Observable<LoginResponse> {
    const refreshToken = this.getRefreshToken();

    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }

    if (this.refreshRequest$) {
      return this.refreshRequest$;
    }

    const payload: RefreshTokenRequest = { refreshToken };

    this.refreshRequest$ = this.http.post<LoginResponse>(`${this.authBaseUrl}/refresh`, payload).pipe(
      map((response) => this.normalizeResponse(response)),
      tap((response) => this.persistSession(response)),
      finalize(() => {
        this.refreshRequest$ = null;
      }),
      shareReplay(1)
    );

    return this.refreshRequest$;
  }

  /**
   * Cierra la sesión localmente y revoca el refresh token en el servidor si existe.
   */
  logout(redirectToLogin: boolean = true): Observable<LogoutResponse | null> {
    const refreshToken = this.getRefreshToken();
    const returnUrl = this.getCurrentReturnUrl();

    this.clearSession();

    const request$ = refreshToken
      ? this.http.post<LogoutResponse>(`${this.authBaseUrl}/logout`, { refreshToken })
      : of(null);

    return request$.pipe(
      catchError(() => of(null)),
      tap(() => {
        if (redirectToLogin) {
          this.navigateToLogin(returnUrl);
        }
      })
    );
  }

  /**
   * Revoca todas las sesiones activas del usuario autenticado.
   */
  revokeAllSessions(): Observable<RevokeAllSessionsResponse> {
    return this.http.post<RevokeAllSessionsResponse>(`${this.authBaseUrl}/revoke-all`, {});
  }

  /**
   * Expira la sesión actual y redirige al login.
   */
  handleSessionExpired(): void {
    const returnUrl = this.getCurrentReturnUrl();
    this.clearSession();
    this.navigateToLogin(returnUrl);
  }

  /**
   * Obtiene el access token almacenado.
   */
  getAccessToken(): string | null {
    return localStorage.getItem(this.accessTokenKey) ?? localStorage.getItem(this.legacyAccessTokenKey);
  }

  /**
   * Alias de compatibilidad con el código existente.
   */
  getToken(): string | null {
    return this.getAccessToken();
  }

  /**
   * Obtiene el refresh token almacenado.
   */
  getRefreshToken(): string | null {
    return localStorage.getItem(this.refreshTokenKey);
  }

  /**
   * Verifica si hay un access token presente.
   */
  hasToken(): boolean {
    return !!this.getAccessToken();
  }

  /**
   * Verifica si existe refresh token.
   */
  hasRefreshToken(): boolean {
    return !!this.getRefreshToken();
  }

  /**
   * Obtiene los datos del usuario almacenados.
   */
  getUserFromStorage(): AuthUser | null {
    const userData = localStorage.getItem(this.userInfoKey) ?? localStorage.getItem(this.legacyUserInfoKey);

    if (!userData) {
      return null;
    }

    try {
      return JSON.parse(userData) as AuthUser;
    } catch {
      return null;
    }
  }

  /**
   * Obtiene el usuario actual.
   */
  getCurrentUser(): AuthUser | null {
    return this.currentUserSubject.value;
  }

  /**
   * Decodifica el JWT para obtener información (sin validar firma)
   */
  decodeToken(token: string): any {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      const payload = parts[1]
        .replace(/-/g, '+')
        .replace(/_/g, '/');
      const paddedPayload = payload.padEnd(Math.ceil(payload.length / 4) * 4, '=');
      const decoded = JSON.parse(atob(paddedPayload));
      return decoded;
    } catch (error) {
      console.error('Error decodificando token:', error);
      return null;
    }
  }

  /**
   * Verifica si el token ha expirado
   */
  isTokenExpired(token?: string): boolean {
    const t = token || this.getAccessToken();
    if (!t) return true;

    const decoded = this.decodeToken(t);
    if (!decoded || !decoded.exp) return true;

    const expirationTime = decoded.exp * 1000;
    const currentTime = new Date().getTime();

    return currentTime >= expirationTime;
  }

  hasValidAccessToken(): boolean {
    const token = this.getAccessToken();
    return !!token && !this.isTokenExpired(token);
  }

  /**
   * Limpia la sesión local.
   */
  private clearSession(): void {
    this.clearRefreshTimer();
    this.refreshRequest$ = null;

    localStorage.removeItem(this.accessTokenKey);
    localStorage.removeItem(this.refreshTokenKey);
    localStorage.removeItem(this.userInfoKey);
    localStorage.removeItem(this.legacyAccessTokenKey);
    localStorage.removeItem(this.legacyUserInfoKey);

    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
  }

  private persistSession(response: LoginResponse): void {
    const normalized = this.normalizeResponse(response);
    const currentUser = normalized.usuario[0] ?? null;

    localStorage.setItem(this.accessTokenKey, normalized.token);
    localStorage.setItem(this.refreshTokenKey, normalized.refreshToken);

    if (currentUser) {
      localStorage.setItem(this.userInfoKey, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(this.userInfoKey);
    }

    localStorage.removeItem(this.legacyAccessTokenKey);
    localStorage.removeItem(this.legacyUserInfoKey);

    this.currentUserSubject.next(currentUser);
    this.isAuthenticatedSubject.next(true);
    this.scheduleTokenRefresh(normalized.expiresIn, normalized.token);
  }

  private normalizeResponse(response: LoginResponse): LoginResponse {
    const cachedUser = this.getUserFromStorage();
    const incomingUser = response.usuario?.[0] ?? null;
    const normalizedUser = this.mergeUser(incomingUser, cachedUser);

    return {
      ...response,
      usuario: normalizedUser ? [normalizedUser] : []
    };
  }

  private mergeUser(incomingUser: Partial<AuthUser> | null, cachedUser: AuthUser | null): AuthUser | null {
    const usuario = incomingUser?.usuario?.trim() || cachedUser?.usuario?.trim() || '';
    const nombre = incomingUser?.nombre?.trim() || incomingUser?.nombreUsu?.trim() || cachedUser?.nombre || cachedUser?.nombreUsu || '';
    const modulo = incomingUser?.modulo?.trim() || cachedUser?.modulo || '';

    if (!usuario) {
      return null;
    }

    return {
      usuario,
      nombre,
      modulo,
      nombreUsu: nombre,
      Usuario: usuario,
      USR01_Usuario: usuario,
      username: usuario,
      user: usuario
    };
  }

  private scheduleTokenRefresh(expiresInSeconds: number, accessToken?: string): void {
    this.clearRefreshTimer();

    const refreshDelay = Math.max(expiresInSeconds * 1000 - this.refreshLeadTimeMs, 1_000);

    this.refreshTimer = setTimeout(() => {
      this.refreshAccessToken().subscribe({
        error: () => {
          if (accessToken && !this.isTokenExpired(accessToken)) {
            this.scheduleRefreshRetry();
            return;
          }

          const currentToken = this.getAccessToken();
          if (currentToken && !this.isTokenExpired(currentToken)) {
            this.scheduleRefreshRetry();
            return;
          }

          this.handleSessionExpired();
        }
      });
    }, refreshDelay);
  }

  private scheduleTokenRefreshFromToken(token: string): void {
    const decoded = this.decodeToken(token);
    const expirationMs = decoded?.exp ? decoded.exp * 1000 : 0;

    if (!expirationMs) {
      this.clearRefreshTimer();
      return;
    }

    const expiresInSeconds = Math.max(Math.floor((expirationMs - Date.now()) / 1000), 1);
    this.scheduleTokenRefresh(expiresInSeconds, token);
  }

  private scheduleRefreshRetry(): void {
    this.clearRefreshTimer();
    this.refreshTimer = setTimeout(() => {
      this.refreshAccessToken().subscribe({
        error: () => {
          const currentToken = this.getAccessToken();
          if (currentToken && !this.isTokenExpired(currentToken)) {
            this.scheduleRefreshRetry();
            return;
          }

          this.handleSessionExpired();
        }
      });
    }, this.refreshRetryDelayMs);
  }

  private clearRefreshTimer(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  private getCurrentReturnUrl(): string {
    return this.router.url && this.router.url !== '/login' ? this.router.url : '/dashboard';
  }

  private navigateToLogin(returnUrl?: string): void {
    if (this.redirectInProgress) {
      return;
    }

    this.redirectInProgress = true;

    void this.router.navigate(['/login'], {
      queryParams: returnUrl && returnUrl !== '/login' ? { returnUrl } : undefined
    }).finally(() => {
      this.redirectInProgress = false;
    });
  }
}
