import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from 'src/environments/environment';
import {
  DashboardInventarioDto,
  DashboardInventarioFiltros
} from '../interfaces/compras-inteligentes-dashboard.interface';

@Injectable({ providedIn: 'root' })
export class ComprasInteligentesDashboardService {
  private readonly http = inject(HttpClient);
  private readonly dashboardUrl = `${environment.apiUrl}/v1/inteligencia-comercial/dashboard`;

  obtenerDashboard(filtros: DashboardInventarioFiltros): Observable<DashboardInventarioDto> {
    return this.http.get<DashboardInventarioDto>(this.dashboardUrl, {
      params: this.buildParams(filtros)
    });
  }

  private buildParams(filtros: DashboardInventarioFiltros): HttpParams {
    return new HttpParams()
      .set('codAlmacen', filtros.codAlmacen)
      .set('topProductosCriticos', filtros.topProductosCriticos)
      .set('topProveedores', filtros.topProveedores)
      .set('topCategorias', filtros.topCategorias)
      .set('topAcciones', filtros.topAcciones);
  }
}
