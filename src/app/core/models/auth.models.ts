// Models para autenticación

export interface LoginRequest {
  usuario: string;
  clave: string;
  modulo: string;
  unidad: string;
  respuesta?: string;
}

export interface AuthUser {
  usuario: string;
  nombre: string;
  modulo: string;
  nombreUsu?: string;
  Usuario?: string;
  USR01_Usuario?: string;
  username?: string;
  user?: string;
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
  expiresIn: number;
  usuario: AuthUser[];
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface LogoutResponse {
  success: boolean;
  message: string;
  tokensRevocados: number;
}

export interface RevokeAllSessionsResponse {
  success: boolean;
  message: string;
  tokensRevocados: number;
}
