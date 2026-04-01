import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

export type ModoPrecio = 'R' | 'N';

export interface DetalleListaPrecioCrmItem {
  MPV05_CodLstPrecio: string;
  MPV05_CodProducto: string;
  MPV05_DesProducto: string;
  MPV05_PrecioTotal: number;
  MPV05_Moneda: string;
  MPV05_Orden?: number;
  MPV01_CodGrupo?: string;
}

export interface DetalleListaPrecioCrmResponse {
  datos?: DetalleListaPrecioCrmItem[];
  paginacion?: { totalRecords?: number };
}

export interface ServicioListaPrecioItem {
  reglaPrecioId: number;
  codigoServicio: string;
  nombreServicio: string;
  precioUnitario: number;
  moneda: string;
  area: string;
}

@Injectable({ providedIn: 'root' })
export class ServiciosListaPrecioService {
  private readonly apiUrl = `${environment.apiUrl}/detalle-lista-precio-crm`;

  constructor(private http: HttpClient) {}

  getServiciosLista(
    codLista: string,
    pageNumber: number,
    pageSize: number,
    searchTerm?: string
  ): Observable<DetalleListaPrecioCrmItem[]> {
    const codLstPrecio = (codLista || '').trim();
    if (!codLstPrecio) {
      return of([]);
    }

    let params = new HttpParams()
      .set('codLstPrecio', codLstPrecio)
      .set('pageNumber', String(pageNumber))
      .set('pageSize', String(pageSize));

    const term = (searchTerm || '').trim();
    if (term) {
      params = params.set('desProducto', term);
    }

    return this.http
      .get<DetalleListaPrecioCrmResponse>(this.apiUrl, { params })
      .pipe(map((res) => res?.datos ?? []));
  }

  mapServicios(items: DetalleListaPrecioCrmItem[]): ServicioListaPrecioItem[] {
    return (items ?? [])
      .map((item) => this.mapServicio(item))
      .filter((item): item is ServicioListaPrecioItem => !!item);
  }

  private mapServicio(item: DetalleListaPrecioCrmItem): ServicioListaPrecioItem | null {
    if (!item) return null;

    const codigo = (item.MPV05_CodProducto || '').toString().trim();
    if (!codigo) return null;

    return {
      reglaPrecioId: Number(item.MPV05_Orden ?? 0) || 0,
      codigoServicio: codigo,
      nombreServicio: (item.MPV05_DesProducto || codigo).toString().trim(),
      precioUnitario: this.toNumber(item.MPV05_PrecioTotal),
      moneda: (item.MPV05_Moneda || '').toString().trim().toUpperCase(),
      area: (item.MPV01_CodGrupo || 'TOURS').toString().trim()
    };
  }

  private toNumber(value?: number | string | null): number {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }
}
