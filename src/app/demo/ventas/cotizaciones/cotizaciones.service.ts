import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { CotizacionApiDto, CotizacionUI } from './cotizacion.models';

type CotizacionResponse = CotizacionApiDto[] | { datos?: CotizacionApiDto[] | CotizacionApiDto | null } | null;

@Injectable({ providedIn: 'root' })
export class CotizacionesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/cotizaciones`;

  getCotizaciones(): Observable<CotizacionUI[]> {
    return this.http.get<CotizacionResponse>(this.apiUrl).pipe(
      map((response) => this.extractArray(response).map((item) => this.mapFromApi(item)))
    );
  }

  private extractArray(response: CotizacionResponse): CotizacionApiDto[] {
    if (Array.isArray(response)) {
      return response;
    }

    const datos = response?.datos;
    if (Array.isArray(datos)) {
      return datos;
    }

    return datos ? [datos] : [];
  }

  private mapFromApi(item: CotizacionApiDto): CotizacionUI {
    const tipNDP = this.readText(item.PPV05_TipNDP ?? item.tipNDP) || 'COT';
    const serie = this.readText(item.PPV05_SerieNDP ?? item.serie);
    const numero = this.readText(item.PPV05_NumNDP ?? item.numero);
    const fallbackId = this.readText(item.PPV05_IdNDP ?? item.id);

    return {
      id: fallbackId || [tipNDP, serie, numero].filter(Boolean).join('-') || `cot-${Math.random().toString(36).slice(2, 10)}`,
      tipNDP,
      serie,
      numero,
      numeroCompleto: [tipNDP, serie, numero].filter(Boolean).join(' '),
      fecha: this.readText(item.PPV05_FecDocu ?? item.fecha),
      cliente: this.readText(item.PPV05_NomCliente ?? item.cliente),
      vendedor: this.readText(item.PPV05_Vendedor ?? item.vendedor ?? item.PPV05_Operador ?? item.operador),
      total: Number(item.PPV05_TotalDocu ?? item.total ?? 0),
      estado: this.readText(item.PPV05_EstDocu ?? item.estado) || 'Pendiente',
      moneda: this.readText(item.PPV05_Moneda ?? item.moneda) || 'CRC'
    };
  }

  private readText(value: unknown): string {
    return String(value ?? '').trim();
  }
}
