import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { EMPTY, Observable, throwError } from 'rxjs';
import { catchError, expand, map, reduce } from 'rxjs/operators';

import { environment } from 'src/environments/environment';
import {
  OrdenPedidoCreatePayload,
  OrdenPedidoCreateResponse,
  OrdenPedidoFiltro,
  OrdenPedidoListadoItem,
  OrdenPedidoListadoResponse
} from '../interfaces/orden-pedido.interface';

type ApiRecord = Record<string, unknown>;

@Injectable({ providedIn: 'root' })
export class OrdenPedidoService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/nota-pedido`;

  getOrdenes(filters: OrdenPedidoFiltro): Observable<OrdenPedidoListadoResponse> {
    let params = new HttpParams()
      .set('pageNumber', String(filters.pageNumber))
      .set('pageSize', String(filters.pageSize));

    const tipOrden = this.normalizeTipOrden(filters.tipOrden);
    const estadoNDP = this.normalizeEstadoNDP(filters.estadoNDP);
    const fechaDesde = this.formatDateForApi(filters.fechaDesde);
    const fechaHasta = this.formatDateForApi(filters.fechaHasta);
    const codCliente = this.clean(filters.codCliente);
    const nomCliente = this.clean(filters.nomCliente);

    params = params.set('tipOrden', tipOrden);
    if (estadoNDP) {
      params = params.set('estadoNDP', estadoNDP);
    }
    if (fechaDesde) {
      params = params.set('fechaDesde', fechaDesde);
    }
    if (fechaHasta) {
      params = params.set('fechaHasta', fechaHasta);
    }
    if (nomCliente) {
      params = params.set('nomCliente', nomCliente);
    }
    if (codCliente) {
      params = params.set('codCliente', codCliente);
    }

    return this.http.get<{ datos?: unknown; paginacion?: unknown }>(`${this.apiUrl}/listaOrdenPedido`, { params }).pipe(
      map((response) => {
        const datos = this.normalizeArray(response?.datos).map((item) => this.mapListadoItem(item));
        const paginacion = this.extractRecord(response?.paginacion);
        const totalRegistros =
          this.readNumber(
            paginacion,
            'totalRegistros',
            'TotalRegistros',
            'total',
            'totalRows',
            'recordsTotal'
          ) || datos.length;
        const paginaActual =
          this.readNumber(
            paginacion,
            'paginaActual',
            'PaginaActual',
            'pageNumber',
            'page',
            'currentPage'
          ) || filters.pageNumber;
        const pageSize =
          this.readNumber(
            paginacion,
            'pageSize',
            'PageSize',
            'TamanoPagina',
            'registrosPorPagina',
            'size'
          ) || filters.pageSize;
        const totalPaginas =
          this.readNumber(
            paginacion,
            'totalPaginas',
            'TotalPaginas',
            'pageCount',
            'totalPages'
          ) ||
          (totalRegistros > 0 ? Math.ceil(totalRegistros / pageSize) : 1);

        return {
          datos,
          paginacion: {
            totalRegistros,
            paginaActual,
            pageSize,
            totalPaginas
          }
        };
      }),
      catchError((error: HttpErrorResponse) => {
        const message =
          error.error?.mensaje || error.error?.respuesta || error.message || 'No se pudieron cargar las ordenes de pedido.';
        return throwError(() => new Error(message));
      })
    );
  }

  getOrdenesAllPages(filters: OrdenPedidoFiltro): Observable<OrdenPedidoListadoResponse> {
    const baseFilters: OrdenPedidoFiltro = {
      ...filters,
      pageNumber: 1,
      pageSize: filters.pageSize > 0 ? filters.pageSize : 100
    };

    return this.getOrdenes(baseFilters).pipe(
      expand((response) => {
        const paginaActual = response.paginacion?.paginaActual || 1;
        const totalPaginas = response.paginacion?.totalPaginas || 1;
        if (paginaActual >= totalPaginas) {
          return EMPTY;
        }

        return this.getOrdenes({
          ...baseFilters,
          pageNumber: paginaActual + 1,
          pageSize: response.paginacion?.pageSize || baseFilters.pageSize
        });
      }),
      reduce<OrdenPedidoListadoResponse, OrdenPedidoListadoResponse>(
        (acc, page) => {
          const datos = [...acc.datos, ...page.datos];
          const pageSize = page.paginacion?.pageSize || acc.paginacion.pageSize;
          const totalRegistros = page.paginacion?.totalRegistros || acc.paginacion.totalRegistros || datos.length;
          const totalPaginas =
            page.paginacion?.totalPaginas ||
            acc.paginacion.totalPaginas ||
            (pageSize > 0 ? Math.ceil(totalRegistros / pageSize) : 1);

          return {
            datos,
            paginacion: {
              totalRegistros,
              paginaActual: page.paginacion?.paginaActual || acc.paginacion.paginaActual,
              pageSize,
              totalPaginas
            }
          };
        },
        {
          datos: [],
          paginacion: {
            totalRegistros: 0,
            paginaActual: 1,
            pageSize: baseFilters.pageSize,
            totalPaginas: 1
          }
        }
      )
    );
  }

  crearOrden(payload: OrdenPedidoCreatePayload): Observable<OrdenPedidoCreateResponse> {
    return this.http.post(`${this.apiUrl}/crear`, payload, { responseType: 'text' }).pipe(
      map((response) => this.parseCreateResponse(response)),
      catchError((error: HttpErrorResponse) => {
        const message = error.error?.mensaje || error.error?.respuesta || error.message || 'No se pudo crear la orden.';
        return throwError(() => new Error(message));
      })
    );
  }

  private mapListadoItem(item: ApiRecord): OrdenPedidoListadoItem {
    return {
      tipOrden: this.readString(item, 'PPV05_TipNDP', 'tipOrden', 'tipo'),
      serie: this.readString(item, 'PPV05_SerieNDP', 'serie', 'serieNDP'),
      numero: this.readString(item, 'PPV05_NumNDP', 'numero', 'numeroNDP'),
      fecha: this.readString(item, 'PPV05_FecDocu', 'fecha', 'fecNDP'),
      cliente: this.readString(item, 'PPV05_NomCliente', 'nomCliente', 'cliente'),
      ruc: this.readString(item, 'PPV05_RucCliente', 'rucCliente', 'ruc'),
      subtotal: this.readNumber(item, 'PPV05_SubTotal', 'subTotal', 'subtotal'),
      impuesto: this.readNumber(item, 'PPV05_Impuesto', 'impuesto'),
      total: this.readNumber(item, 'PPV05_TotalDocu', 'totDocu', 'total'),
      estado: this.readString(item, 'PPV05_EstDocu', 'estado'),
      items: this.readNumber(item, 'PPV05_Items', 'items', 'cantidadItems'),
      observaciones: this.readString(item, 'PPV05_Observaciones', 'observaciones'),
      operador: this.readString(item, 'PPV05_Operador', 'operador', 'usuario')
    };
  }

  private parseCreateResponse(response: string): OrdenPedidoCreateResponse {
    const text = (response ?? '').toString().trim();
    if (!text) {
      return {};
    }

    try {
      return JSON.parse(text) as OrdenPedidoCreateResponse;
    } catch {
      return { respuesta: text };
    }
  }

  private normalizeArray(source: unknown): ApiRecord[] {
    if (!Array.isArray(source)) {
      return [];
    }
    return source.filter((item): item is ApiRecord => !!item && typeof item === 'object' && !Array.isArray(item));
  }

  private extractRecord(source: unknown): ApiRecord {
    if (Array.isArray(source)) {
      const first = source.find((item) => !!item && typeof item === 'object' && !Array.isArray(item));
      return (first as ApiRecord) ?? {};
    }
    if (source && typeof source === 'object') {
      return source as ApiRecord;
    }
    return {};
  }

  private readString(record: ApiRecord, ...keys: string[]): string {
    for (const key of keys) {
      const value = record[key];
      if (value === null || value === undefined) {
        continue;
      }
      const text = String(value).trim();
      if (text) {
        return text;
      }
    }
    return '';
  }

  private readNumber(record: ApiRecord, ...keys: string[]): number {
    for (const key of keys) {
      const raw = record[key];
      const value = Number(raw);
      if (Number.isFinite(value)) {
        return value;
      }
    }
    return 0;
  }

  private clean(value: unknown): string {
    return String(value ?? '').trim();
  }

  private normalizeTipOrden(value: unknown): string {
    const normalized = this.clean(value).toUpperCase();
    return normalized === 'COT' ? 'COT' : 'NDP';
  }

  private normalizeEstadoNDP(value: unknown): string {
    const normalized = this.clean(value).toUpperCase();
    if (normalized === 'ABI' || normalized === 'FAC' || normalized === 'ANU') {
      return normalized;
    }
    return '';
  }

  private formatDateForApi(value: unknown): string {
    const raw = this.clean(value);
    if (!raw) {
      return '';
    }
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
      return this.isValidApiDate(raw) ? raw : '';
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      const [year, month, day] = raw.split('-');
      const formatted = `${day}/${month}/${year}`;
      return this.isValidApiDate(formatted) ? formatted : '';
    }
    return '';
  }

  private isValidApiDate(value: string): boolean {
    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
    if (!match) {
      return false;
    }

    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);
    const date = new Date(year, month - 1, day);

    return (
      Number.isFinite(day) &&
      Number.isFinite(month) &&
      Number.isFinite(year) &&
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    );
  }

  /**
   * Parsea un formato de cotización combinado: "COT 000 002-0000011665"
   * Extrae los componentes: tipo, serie y número.
   * @param fullFormat - Cadena en formato "TIPO [CODE] SERIE-NUMERO"
   * @returns Objeto con propiedades tipNDP, serie, numero
   */
  parseQuotationFormat(fullFormat: string | null | undefined): { tipNDP: string; serie: string; numero: string } {
    const result = { tipNDP: '', serie: '', numero: '' };

    if (!fullFormat) {
      return result;
    }

    const raw = String(fullFormat).trim();
    if (!raw) {
      return result;
    }

    // Ejemplo: "COT 000 002-0000011665"
    // Esperado: tipNDP="COT", serie="002", numero="0000011665"
    // Patrón: TIPO [ESPACIOS/CODIGO] SERIE GUION NUMERO
    const pattern = /^(\w+)\s+\d+\s+(\d+)-(\d+)$/;
    const match = pattern.exec(raw);

    if (match) {
      result.tipNDP = match[1].toUpperCase();
      result.serie = match[2];
      result.numero = match[3];
      return result;
    }

    // Fallback: intenta separar por espacios y guiones
    const parts = raw.split(/\s+|-/);
    if (parts.length >= 2) {
      result.tipNDP = parts[0].toUpperCase();
      // Si hay al menos 3 partes: tipo, [código], serie-numero
      // Si hay al menos 4 partes: tipo, código, serie, numero
      if (parts.length >= 4) {
        result.serie = parts[parts.length - 2];
        result.numero = parts[parts.length - 1];
      } else if (parts.length === 3) {
        // "COT" "002-0000011665" → necesita dividir el último
        const lastPart = parts[2];
        if (lastPart.includes('-')) {
          const [serie, numero] = lastPart.split('-');
          result.serie = serie;
          result.numero = numero;
        } else {
          result.serie = parts[1];
          result.numero = parts[2];
        }
      }
    }

    return result;
  }
}
