import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import {
  AnaliticoComprasProveedor,
  AnaliticoComprasProveedorRequest,
  AnaliticoVentasProveedor,
  AnaliticoVentasProveedorRequest,
  ComprasReporteResponse,
  ProductoSinMovimiento,
  ProductosSinMovimientoRequest,
  RotacionProducto,
  RotacionProductosRequest
} from '../interfaces/compras-reportes.interface';
import {
  InventarioHistoricoRequest,
  InventarioHistoricoResponse
} from '../interfaces/inventario-historico.interface';

@Injectable({ providedIn: 'root' })
export class ComprasReportesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/reportes/compras`;

  getAnaliticoVentasProveedor(params: AnaliticoVentasProveedorRequest): Observable<ComprasReporteResponse<AnaliticoVentasProveedor[]>> {
    return this.http.get<ComprasReporteResponse<AnaliticoVentasProveedor[]>>(`${this.baseUrl}/analitico-ventas-proveedor`, {
      params: this.buildParams({
        FechaDesde: params.fechaDesde,
        FechaHasta: params.fechaHasta,
        CodProveedor: params.codProveedor,
        CodProducto: params.codProducto,
        Almacen: params.almacen,
        ProveedorHistorico: params.proveedorHistorico
      })
    });
  }

  getAnaliticoComprasProveedor(params: AnaliticoComprasProveedorRequest): Observable<ComprasReporteResponse<AnaliticoComprasProveedor[]>> {
    return this.http.get<ComprasReporteResponse<AnaliticoComprasProveedor[]>>(`${this.baseUrl}/analitico-compras-proveedor`, {
      params: this.buildParams({
        FechaDesde: params.fechaDesde,
        FechaHasta: params.fechaHasta,
        CodProveedor: params.codProveedor,
        CodProducto: params.codProducto,
        Almacen: params.almacen
      })
    });
  }

  getRotacionProductos(params: RotacionProductosRequest): Observable<ComprasReporteResponse<RotacionProducto[]>> {
    return this.http.get<ComprasReporteResponse<RotacionProducto[]>>(`${this.baseUrl}/rotacion-productos`, {
      params: this.buildParams({
        FechaDesde: params.fechaDesde,
        FechaHasta: params.fechaHasta,
        CodProveedor: params.codProveedor,
        CodProducto: params.codProducto
      })
    });
  }

  getProductosSinMovimiento(params: ProductosSinMovimientoRequest): Observable<ComprasReporteResponse<ProductoSinMovimiento[]>> {
    return this.http.get<ComprasReporteResponse<ProductoSinMovimiento[]>>(`${this.baseUrl}/alertas-productos-sin-movimiento`, {
      params: this.buildParams({
        FechaCorte: params.fechaCorte,
        DiasAlerta: params.diasAlerta,
        CodProveedor: params.codProveedor,
        CodProducto: params.codProducto
      })
    });
  }

  getInventarioHistorico(params: InventarioHistoricoRequest): Observable<InventarioHistoricoResponse> {
    return this.http.get<InventarioHistoricoResponse>(`${this.baseUrl}/inventario-historico`, {
      params: this.buildParams({
        fechaDesde: params.fechaDesde,
        fechaHasta: params.fechaHasta,
        codAlmacen: params.codAlmacen,
        codProveedor: params.codProveedor,
        pageNumber: params.pageNumber,
        pageSize: params.pageSize
      })
    });
  }

  private buildParams(params: object): HttpParams {
    return Object.entries(params).reduce((httpParams, [key, value]) => {
      if (value === undefined || value === null || value === '') {
        return httpParams;
      }
      return httpParams.set(key, String(value));
    }, new HttpParams());
  }
}
