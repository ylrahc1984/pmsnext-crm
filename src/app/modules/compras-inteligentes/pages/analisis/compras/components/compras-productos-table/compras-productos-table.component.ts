import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnaliticoComprasProveedor } from '../../../../../interfaces/compras-reportes.interface';

type CampoOrden = 'cantidadComprada' | 'netoComprado' | 'costoPromedio' | 'ultimoCosto' | 'variacionCostoPromedio' | 'participacionProveedor';

@Component({
  selector: 'app-compras-productos-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './compras-productos-table.component.html',
  styleUrls: ['./compras-productos-table.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ComprasProductosTableComponent {
  readonly filas = input.required<readonly AnaliticoComprasProveedor[]>();
  readonly busqueda = signal('');
  readonly campoOrden = signal<CampoOrden>('netoComprado');
  readonly direccion = signal<'asc' | 'desc'>('desc');
  readonly expandido = signal<string | null>(null);

  readonly filasVisibles = computed(() => {
    const term = this.busqueda().trim().toLocaleLowerCase('es');
    const campo = this.campoOrden();
    const factor = this.direccion() === 'asc' ? 1 : -1;
    return this.filas()
      .filter((fila) => !term || fila.codProducto.toLocaleLowerCase('es').includes(term) || fila.producto.toLocaleLowerCase('es').includes(term))
      .slice()
      .sort((a, b) => ((a[campo] ?? Number.NEGATIVE_INFINITY) - (b[campo] ?? Number.NEGATIVE_INFINITY)) * factor);
  });

  actualizarBusqueda(event: Event): void {
    this.busqueda.set((event.target as HTMLInputElement).value);
  }

  ordenar(campo: CampoOrden): void {
    if (this.campoOrden() === campo) {
      this.direccion.update((value) => value === 'asc' ? 'desc' : 'asc');
    } else {
      this.campoOrden.set(campo);
      this.direccion.set('desc');
    }
  }

  alternarDetalle(codigo: string): void {
    this.expandido.update((value) => value === codigo ? null : codigo);
  }

  iconoOrden(campo: CampoOrden): string {
    return this.campoOrden() === campo ? (this.direccion() === 'asc' ? '↑' : '↓') : '';
  }

  formatCurrency(value: number | null | undefined): string {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) return '—';
    return new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value));
  }

  formatNumber(value: number | null | undefined): string {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) return '—';
    return new Intl.NumberFormat('es-CR', { maximumFractionDigits: 2 }).format(Number(value));
  }

  formatPercent(value: number | null | undefined, signed = false): string {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) return '—';
    const numeric = Number(value);
    return `${signed && numeric > 0 ? '+' : ''}${new Intl.NumberFormat('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(numeric)}%`;
  }

  formatDate(value: string | null): string {
    if (!value) return '—';
    const slash = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(value);
    const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    const date = slash ? new Date(+slash[3], +slash[2] - 1, +slash[1]) : iso ? new Date(+iso[1], +iso[2] - 1, +iso[3]) : null;
    return date ? new Intl.DateTimeFormat('es-CR', { day: '2-digit', month: 'short', year: 'numeric' }).format(date) : value;
  }

  variacionIcono(value: number | null): string {
    if (value === null || !Number.isFinite(Number(value)) || value === 0) return '';
    return value > 0 ? '↑' : '↓';
  }

  costoTone(value: number | null): string {
    if (value === null || !Number.isFinite(Number(value)) || value === 0) return 'neutral';
    return value > 0 ? 'attention' : 'favorable';
  }

  estadoTone(estado: string): string {
    const value = estado.trim().toUpperCase();
    if (value === 'SIN COMPRA ANTERIOR') return 'info';
    if (value === 'SIN COMPRA ACTUAL') return 'neutral';
    if (value.includes('DISMINUCION')) return 'warning';
    return 'stable';
  }

  estadoIcono(estado: string): string {
    const value = estado.trim().toUpperCase();
    if (value === 'SIN COMPRA ANTERIOR') return '+';
    if (value === 'SIN COMPRA ACTUAL') return '○';
    if (value.includes('DISMINUCION')) return '↓';
    return '↔';
  }

  barWidth(value: number): string {
    return `${Math.min(100, Math.max(0, Number(value) || 0))}%`;
  }
}

