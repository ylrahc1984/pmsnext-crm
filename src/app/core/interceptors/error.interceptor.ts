import { Injectable, inject } from '@angular/core';
import {
  HttpInterceptor,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ToastService } from '../services/toast.service';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  private toastService = inject(ToastService);

  intercept(req: import('@angular/common/http').HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        this.handleError(error, req.url);
        return throwError(() => error);
      })
    );
  }

  private handleError(error: HttpErrorResponse, requestUrl: string): void {
    if (this.isAuthEndpoint(requestUrl) && error.status !== 0) {
      return;
    }

    if (this.isComprasReportingEndpoint(requestUrl) && (error.status === 400 || error.status === 404)) {
      return;
    }

    switch (error.status) {
      case 401:
        break;
      case 403:
        this.handleForbidden();
        break;
      case 0:
        this.handleConnectionError();
        break;
      default:
        this.handleGenericError(error);
    }
  }

  private handleForbidden(): void {
    console.warn('Error 403: Acceso prohibido.');
    this.toastService.error('Sin permisos para realizar esta acción.');
  }

  private handleConnectionError(): void {
    console.error('Error de conexión con el servidor.');
    this.toastService.warning('No se puede conectar con el servidor. Verifique su conexión.');
    // No hacer logout en errores de conexión, permitir reintentos
  }

  private handleGenericError(error: HttpErrorResponse): void {
    const backendMessage =
      typeof error.error === 'string'
        ? error.error
        : error.error?.mensaje || error.error?.respuesta || error.error?.message || error.error?.error;
    console.error('Error HTTP:', {
      status: error.status,
      statusText: error.statusText,
      message: error.message,
      url: error.url,
      backend: error.error
    });
    const message = backendMessage || `Error ${error.status}: ${error.statusText}`;
    this.toastService.error(message);
  }

  private isAuthEndpoint(url: string | null): boolean {
    return !!url && /\/login\/(login|refresh|logout)$/i.test(url);
  }

  private isComprasReportingEndpoint(url: string | null): boolean {
    return !!url && /\/reportes\/compras\/(analitico-ventas-proveedor|analitico-compras-proveedor|rotacion-productos|alertas-productos-sin-movimiento)(?:\?|$)/i.test(url);
  }
}
