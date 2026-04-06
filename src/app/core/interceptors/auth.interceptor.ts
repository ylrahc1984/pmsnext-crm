import { Injectable } from '@angular/core';
import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable, catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (this.isPublicAuthRequest(req.url)) {
      return next.handle(req);
    }

    const token = this.authService.getAccessToken();
    const requestToHandle = token ? this.addAuthorizationHeader(req, token) : req;

    return next.handle(requestToHandle).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status !== 401) {
          return throwError(() => error);
        }

        return this.authService.refreshAccessToken().pipe(
          switchMap((response) => next.handle(this.addAuthorizationHeader(req, response.token))),
          catchError((refreshError) => {
            this.authService.handleSessionExpired();
            return throwError(() => refreshError);
          })
        );
      })
    );
  }

  private addAuthorizationHeader(req: HttpRequest<any>, token: string): HttpRequest<any> {
    return req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  private isPublicAuthRequest(url: string): boolean {
    return /\/login\/(login|refresh|logout)$/i.test(url);
  }
}
