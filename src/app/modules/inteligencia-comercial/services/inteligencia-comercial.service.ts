import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from 'src/environments/environment';
import { ApiResponse } from '../interfaces/api-response.interface';
import { AlertasInventarioResponse } from '../interfaces/alertas-response.interface';
import { FiltrosAlertasInventario } from '../interfaces/filtros-alertas.interface';
import { FiltrosFlujoCajaInventario } from '../interfaces/filtros-flujo-caja.interface';
import { FiltrosProductos } from '../interfaces/filtros-productos.interface';
import { FiltrosProveedoresInteligencia } from '../interfaces/filtros-proveedores-inteligencia.interface';
import { FiltrosRecomendacionesCompra } from '../interfaces/filtros-recomendaciones-compra.interface';
import { FiltrosRotacionInventario } from '../interfaces/filtros-rotacion.interface';
import { FlujoCajaInventarioResponse } from '../interfaces/flujo-caja-response.interface';
import { ProductoAnalisis } from '../interfaces/producto-analisis.interface';
import { ProveedoresInteligenciaResponse } from '../interfaces/proveedores-inteligencia-response.interface';
import { RecomendacionesCompraResponse } from '../interfaces/recomendaciones-compra-response.interface';
import { RotacionInventarioResponse } from '../interfaces/rotacion-response.interface';
import {
  INTELIGENCIA_COMERCIAL_API_PATH,
  INTELIGENCIA_COMERCIAL_DEFAULT_PAGINATION,
  INTELIGENCIA_COMERCIAL_ENDPOINTS
} from '../models/inteligencia-comercial.constants';
import { buildQueryParams } from '../utils/query-params.helper';

@Injectable({
  providedIn: 'root'
})
export class InteligenciaComercialService {
  private readonly baseUrl = `${environment.apiUrl}/${INTELIGENCIA_COMERCIAL_API_PATH}`;
  private readonly productosUrl = `${this.baseUrl}/${INTELIGENCIA_COMERCIAL_ENDPOINTS.productos}`;
  private readonly rotacionUrl = `${this.baseUrl}/${INTELIGENCIA_COMERCIAL_ENDPOINTS.rotacion}`;
  private readonly alertasUrl = `${this.baseUrl}/${INTELIGENCIA_COMERCIAL_ENDPOINTS.alertas}`;
  private readonly recomendacionesCompraUrl = `${this.baseUrl}/${INTELIGENCIA_COMERCIAL_ENDPOINTS.recomendacionesCompra}`;
  private readonly flujoCajaUrl = `${this.baseUrl}/${INTELIGENCIA_COMERCIAL_ENDPOINTS.flujoCaja}`;
  private readonly proveedoresUrl = `${this.baseUrl}/${INTELIGENCIA_COMERCIAL_ENDPOINTS.proveedores}`;

  constructor(private readonly http: HttpClient) {}

  /**
   * Obtiene el analisis comercial de productos con filtros dinamicos y paginacion opcional.
   */
  obtenerProductos(filtros: FiltrosProductos = {}): Observable<ApiResponse<ProductoAnalisis[]>> {
    const params = buildQueryParams<FiltrosProductos>({
      ...INTELIGENCIA_COMERCIAL_DEFAULT_PAGINATION,
      ...filtros
    });

    return this.http.get<ApiResponse<ProductoAnalisis[]>>(this.productosUrl, { params });
  }

  /**
   * Obtiene indicadores de rotacion, consumo y salud de inventario con filtros dinamicos.
   */
  obtenerRotacionInventario(filtros: FiltrosRotacionInventario = {}): Observable<RotacionInventarioResponse> {
    const params = buildQueryParams<FiltrosRotacionInventario>({
      ...INTELIGENCIA_COMERCIAL_DEFAULT_PAGINATION,
      ...filtros
    });

    return this.http.get<RotacionInventarioResponse>(this.rotacionUrl, { params });
  }

  getRotacionInventario(filtros: FiltrosRotacionInventario = {}): Observable<RotacionInventarioResponse> {
    return this.obtenerRotacionInventario(filtros);
  }

  /**
   * Obtiene alertas inteligentes de inventario con filtros operativos, logging y debug opcional.
   */
  obtenerAlertasInventario(filtros: FiltrosAlertasInventario = {}): Observable<AlertasInventarioResponse> {
    const params = buildQueryParams<FiltrosAlertasInventario>({
      ...INTELIGENCIA_COMERCIAL_DEFAULT_PAGINATION,
      ...filtros
    });

    console.log('[InteligenciaComercialService] GET alertas inventario', {
      url: this.alertasUrl,
      params: params.toString(),
      filtros
    });

    return this.http.get<AlertasInventarioResponse>(this.alertasUrl, { params });
  }

  /**
   * Obtiene recomendaciones estrategicas de compra con filtros de prioridad, presupuesto y reposicion preventiva.
   */
  obtenerRecomendacionesCompra(filtros: FiltrosRecomendacionesCompra = {}): Observable<RecomendacionesCompraResponse> {
    const params = buildQueryParams<FiltrosRecomendacionesCompra>({
      ...INTELIGENCIA_COMERCIAL_DEFAULT_PAGINATION,
      ...filtros
    });

    return this.http.get<RecomendacionesCompraResponse>(this.recomendacionesCompraUrl, { params });
  }

  /**
   * Obtiene analisis financiero de inventario y presion sobre flujo de caja con filtros dinamicos.
   */
  obtenerFlujoCajaInventario(filtros: FiltrosFlujoCajaInventario = {}): Observable<FlujoCajaInventarioResponse> {
    const params = buildQueryParams<FiltrosFlujoCajaInventario>({
      ...INTELIGENCIA_COMERCIAL_DEFAULT_PAGINATION,
      ...filtros
    });

    return this.http.get<FlujoCajaInventarioResponse>(this.flujoCajaUrl, { params });
  }

  /**
   * Obtiene inteligencia de proveedores con analisis de dependencia, credito, lead time y concentracion de compras.
   */
  obtenerProveedoresInteligencia(
    filtros: FiltrosProveedoresInteligencia = {}
  ): Observable<ProveedoresInteligenciaResponse> {
    const params = buildQueryParams<FiltrosProveedoresInteligencia>({
      ...INTELIGENCIA_COMERCIAL_DEFAULT_PAGINATION,
      ...filtros
    });

    return this.http.get<ProveedoresInteligenciaResponse>(this.proveedoresUrl, { params });
  }
}
