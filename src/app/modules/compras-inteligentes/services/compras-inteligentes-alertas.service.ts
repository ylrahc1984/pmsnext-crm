import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from 'src/environments/environment';
import {
  ComprasInteligentesAlertasFiltros,
  ComprasInteligentesAlertasResponse
} from '../interfaces/compras-inteligentes-alertas.interface';

@Injectable({ providedIn: 'root' })
export class ComprasInteligentesAlertasService {
  private readonly alertasUrl = `${environment.apiUrl}/v1/inteligencia-comercial/alertas`;

  constructor(private readonly http: HttpClient) {}

  obtenerAlertas(filtros: ComprasInteligentesAlertasFiltros = {}): Observable<ComprasInteligentesAlertasResponse> {
    const filtrosRequest: ComprasInteligentesAlertasFiltros = {
      pageNumber: 1,
      pageSize: 50,
      registrarLog: false,
      debug: false,
      ...filtros
    };
    const params = this.buildParams(filtrosRequest);
    const queryString = params.toString();
    const urlCompleta = queryString ? `${this.alertasUrl}?${queryString}` : this.alertasUrl;

    console.groupCollapsed('[ComprasInteligentesAlertasService] GET alertas inventario');
    console.log('Metodo:', 'GET');
    console.log('URL:', urlCompleta);
    console.log('Filtros:', filtrosRequest);
    console.groupEnd();

    return this.http.get<ComprasInteligentesAlertasResponse>(this.alertasUrl, { params });
  }

  private buildParams(filtros: ComprasInteligentesAlertasFiltros): HttpParams {
    let params = new HttpParams();

    Object.entries(filtros).forEach(([key, value]) => {
      if (value === null || value === undefined) {
        return;
      }

      if (typeof value === 'string' && value.trim().length === 0) {
        return;
      }

      params = params.set(key, String(typeof value === 'string' ? value.trim() : value));
    });

    return params;
  }

}
