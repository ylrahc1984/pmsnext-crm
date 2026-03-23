import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { CotizacionUI } from './cotizacion.models';

@Component({
  selector: 'app-cotizaciones-list',
  standalone: true,
  imports: [CommonModule, CurrencyPipe],
  templateUrl: './cotizaciones-list.component.html',
  styleUrl: './cotizaciones-list.component.scss'
})
export class CotizacionesListComponent {
  readonly data = input<CotizacionUI[]>([]);

  getEstadoClass(estado: string): string {
    const normalized = (estado || '').trim().toUpperCase();
    if (normalized.includes('APR') || normalized.includes('APROB')) return 'cotizacion-badge--aprobada';
    if (normalized.includes('RECH') || normalized.includes('ANUL')) return 'cotizacion-badge--rechazada';
    if (normalized.includes('PEND')) return 'cotizacion-badge--pendiente';
    return 'cotizacion-badge--cotizacion';
  }

  formatFecha(value: string): string {
    const raw = String(value ?? '').trim();
    if (!raw) return 'N/D';
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) return raw;
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      const [year, month, day] = raw.split('-');
      return `${day}/${month}/${year}`;
    }
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      const day = String(parsed.getDate()).padStart(2, '0');
      const month = String(parsed.getMonth() + 1).padStart(2, '0');
      const year = parsed.getFullYear();
      return `${day}/${month}/${year}`;
    }
    return raw;
  }
}
