import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { AuthService } from 'src/app/core/services/auth.service';
import { environment } from 'src/environments/environment';
import {
  OPORTUNIDAD_ETAPAS,
  OportunidadApiDto,
  OportunidadEtapa,
  OportunidadFiltros,
  OportunidadFormValue,
  OportunidadResumenPipeline,
  OportunidadUI
} from './oportunidad.models';

type OportunidadResponse = OportunidadApiDto[] | { datos?: OportunidadApiDto[] | OportunidadApiDto | null };

@Injectable({
  providedIn: 'root'
})
export class OportunidadService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private apiUrl = `${environment.apiUrl}/oportunidad`;

  getListado(estado?: string): Observable<OportunidadUI[]> {
    let params = new HttpParams();
    if (estado?.trim()) {
      params = params.set('estado', estado.trim());
    }

    return this.http.get<OportunidadResponse>(this.apiUrl, { params }).pipe(
      map((response) => this.extractArray(response).map((item) => this.mapFromApi(item)))
    );
  }

  getById(id: number | string): Observable<OportunidadUI | null> {
    return this.http.get<OportunidadApiDto | null>(`${this.apiUrl}/${id}`).pipe(
      map((response) => (response ? this.mapFromApi(response) : null))
    );
  }

  getByCliente(codCliente: string, estado?: string): Observable<OportunidadUI[]> {
    let params = new HttpParams();
    if (estado?.trim()) {
      params = params.set('estado', estado.trim());
    }

    return this.http.get<OportunidadResponse>(`${this.apiUrl}/cliente/${codCliente}`, { params }).pipe(
      map((response) => this.extractArray(response).map((item) => this.mapFromApi(item)))
    );
  }

  getPipelineResumen(): Observable<OportunidadResumenPipeline[]> {
    return this.http.get<Array<{ PPV04_Etapa?: string; Cantidad?: number; Total?: number }> | null>(`${this.apiUrl}/pipeline/resumen`).pipe(
      map((response) =>
        (response ?? []).map((item) => ({
          etapa: this.normalizeStage(item.PPV04_Etapa),
          cantidad: Number(item.Cantidad ?? 0),
          total: Number(item.Total ?? 0)
        }))
      )
    );
  }

  getPipelineDetalle(filters: OportunidadFiltros = {}): Observable<OportunidadUI[]> {
    let params = new HttpParams();
    if (filters.busqueda?.trim()) params = params.set('busqueda', filters.busqueda.trim());
    if (filters.etapa?.trim()) params = params.set('etapa', filters.etapa.trim());
    if (filters.estado?.trim()) params = params.set('estado', filters.estado.trim());
    if (filters.vendedor?.trim()) params = params.set('vendedor', filters.vendedor.trim());
    if (filters.fechaInicio?.trim()) params = params.set('fechaInicio', filters.fechaInicio.trim());
    if (filters.fechaFin?.trim()) params = params.set('fechaFin', filters.fechaFin.trim());
    if (filters.montoMin !== null && filters.montoMin !== undefined) params = params.set('montoMin', String(filters.montoMin));
    if (filters.montoMax !== null && filters.montoMax !== undefined) params = params.set('montoMax', String(filters.montoMax));
    if (filters.conCotizacion !== null && filters.conCotizacion !== undefined) params = params.set('conCotizacion', String(filters.conCotizacion));

    return this.http.get<OportunidadResponse>(`${this.apiUrl}/pipeline/detalle`, { params }).pipe(
      map((response) => this.extractArray(response).map((item) => this.mapFromApi(item)))
    );
  }

  create(payload: OportunidadFormValue): Observable<{ mensaje?: string }> {
    return this.http.post<{ mensaje?: string }>(this.apiUrl, {
      PPV04_CodClien: payload.codCliente,
      PPV04_Titulo: payload.titulo,
      PPV04_Descripcion: payload.descripcion,
      PPV04_MontoEstimado: Number(payload.montoEstimado || 0),
      PPV04_Probabilidad: Number(payload.probabilidad || 0),
      PPV04_Etapa: this.normalizeStage(payload.etapa),
      PPV04_Vendedor: payload.vendedor?.trim() || '',
      PPV04_Operador: this.getOperador()
    });
  }

  update(id: number, payload: OportunidadFormValue): Observable<{ mensaje?: string }> {
    return this.http.put<{ mensaje?: string }>(this.apiUrl, {
      PPV04_IdOportunidad: id,
      PPV04_Titulo: payload.titulo,
      PPV04_Descripcion: payload.descripcion,
      PPV04_MontoEstimado: Number(payload.montoEstimado || 0),
      PPV04_Probabilidad: Number(payload.probabilidad || 0),
      PPV04_Vendedor: payload.vendedor?.trim() || ''
    });
  }

  delete(id: number | string): Observable<{ mensaje?: string }> {
    const params = new HttpParams().set('operador', this.getOperador());
    return this.http.delete<{ mensaje?: string }>(`${this.apiUrl}/${id}`, { params });
  }

  changeStage(id: number | string, etapa: OportunidadEtapa): Observable<{ mensaje?: string }> {
    return this.http.patch<{ mensaje?: string }>(`${this.apiUrl}/${id}/etapa`, {
      Etapa: this.normalizeStage(etapa),
      Operador: this.getOperador()
    });
  }

  vincularCotizacion(
    id: number | string,
    payload: { tipNDP: string; serieNDP: string; numNDP: string }
  ): Observable<{ mensaje?: string }> {
    return this.http.patch<{ mensaje?: string }>(`${this.apiUrl}/${id}/cotizacion`, {
      TipNDP: this.normalizeText(payload.tipNDP),
      SerieNDP: this.normalizeText(payload.serieNDP),
      NumNDP: this.normalizeText(payload.numNDP),
      Operador: this.getOperador()
    });
  }

  private extractArray(response: OportunidadResponse): OportunidadApiDto[] {
    if (Array.isArray(response)) return response;
    const datos = response?.datos;
    if (Array.isArray(datos)) return datos;
    return datos ? [datos] : [];
  }

  private mapFromApi(item: OportunidadApiDto): OportunidadUI {
    const tipNDP = this.normalizeText(item.PPV04_TipNDP);
    const serieNDP = this.normalizeText(item.PPV04_SerieNDP);
    const numNDP = this.normalizeText(item.PPV04_NumNDP);

    return {
      id: Number(item.PPV04_IdOportunidad ?? 0),
      codCliente: this.normalizeText(item.PPV04_CodClien),
      clienteNombre: this.normalizeText(item.ClienteNombre),
      titulo: this.normalizeText(item.PPV04_Titulo),
      descripcion: this.normalizeText(item.PPV04_Descripcion),
      montoEstimado: Number(item.PPV04_MontoEstimado ?? 0),
      probabilidad: Number(item.PPV04_Probabilidad ?? 0),
      etapa: this.normalizeStage(item.PPV04_Etapa),
      estado: this.normalizeText(item.PPV04_Estado || 'A') || 'A',
      fechaCreacion: item.PPV04_FechaCreacion ?? '',
      fechaCierreEstimada: item.PPV04_FechaCierreEstimada ?? null,
      fechaCierreReal: item.PPV04_FechaCierreReal ?? null,
      vendedor: this.normalizeText(item.PPV04_Vendedor),
      tipNDP,
      serieNDP,
      numNDP,
      origen: this.normalizeText(item.PPV04_Origen),
      prioridad: this.normalizeText(item.PPV04_Prioridad),
      tipoCliente: this.normalizeText(item.PPV04_TipoCliente),
      tieneCotizacion: !!(tipNDP || serieNDP || numNDP)
    };
  }

  private normalizeText(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }
    return String(value).trim();
  }

  private normalizeStage(value: string | number | null | undefined): OportunidadEtapa {
    const normalized = (value ?? '').toString().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
    if (OPORTUNIDAD_ETAPAS.includes(normalized as OportunidadEtapa)) {
      return normalized as OportunidadEtapa;
    }
    return 'PROSPECTO';
  }

  private getOperador(): string {
    const currentUser = this.authService.getCurrentUser();
    return currentUser?.usuario || currentUser?.Usuario || currentUser?.USR01_Usuario || currentUser?.username || currentUser?.user || 'ADMIN';
  }
}
