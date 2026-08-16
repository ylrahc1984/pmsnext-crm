import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnaliticoVentasProveedor } from '../../../../../interfaces/compras-reportes.interface';

type CampoOrden = 'cantidadNeta' | 'ventaNeta' | 'margenPorcentaje' | 'participacionProveedor' | 'frecuenciaVenta' | 'variacionVenta';
type DireccionOrden = 'asc' | 'desc';

@Component({
  selector: 'app-ventas-productos-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ventas-productos-table.component.html',
  styleUrls: ['./ventas-productos-table.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VentasProductosTableComponent {
  readonly filas = input.required<readonly AnaliticoVentasProveedor[]>();
  readonly busqueda = signal('');
  readonly campoOrden = signal<CampoOrden>('participacionProveedor');
  readonly direccionOrden = signal<DireccionOrden>('desc');
  readonly productoExpandido = signal<string | null>(null);

  readonly filasVisibles = computed(() => {
    const termino = this.busqueda().trim().toLocaleLowerCase('es');
    const campo = this.campoOrden();
    const factor = this.direccionOrden() === 'asc' ? 1 : -1;
    return this.filas()
      .filter((fila) => !termino || fila.codProducto.toLocaleLowerCase('es').includes(termino) || fila.producto.toLocaleLowerCase('es').includes(termino))
      .slice()
      .sort((a, b) => ((a[campo] ?? Number.NEGATIVE_INFINITY) - (b[campo] ?? Number.NEGATIVE_INFINITY)) * factor);
  });

  ordenar(campo: CampoOrden): void {
    if (this.campoOrden() === campo) {
      this.direccionOrden.update((direccion) => direccion === 'asc' ? 'desc' : 'asc');
      return;
    }
    this.campoOrden.set(campo);
    this.direccionOrden.set('desc');
  }

  alternarDetalle(codigo: string): void {
    this.productoExpandido.update((actual) => actual === codigo ? null : codigo);
  }

  actualizarBusqueda(event: Event): void {
    this.busqueda.set((event.target as HTMLInputElement).value);
  }

  iconoOrden(campo: CampoOrden): string {
    if (this.campoOrden() !== campo) return '';
    return this.direccionOrden() === 'asc' ? '↑' : '↓';
  }

  estadoIcono(estado: string): string {
    const normalizado = estado.trim().toUpperCase();
    if (normalizado === 'CRECIENDO') return '↑';
    if (normalizado === 'DISMINUYENDO') return '↓';
    return '○';
  }

  estadoClase(estado: string): string {
    const normalizado = estado.trim().toUpperCase();
    if (normalizado === 'CRECIENDO') return 'success';
    if (normalizado === 'DISMINUYENDO') return 'warning';
    return 'neutral';
  }

  variacionClase(value: number | null): string {
    if (value === null || !Number.isFinite(value)) return 'neutral';
    if (value > 0) return 'positive';
    if (value < 0) return 'negative';
    return 'neutral';
  }

  formatCurrency(value: number | null | undefined): string {
    return new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(Number(value) || 0);
  }

  formatNumber(value: number | null | undefined, maximumFractionDigits = 2): string {
    return new Intl.NumberFormat('es-CR', { maximumFractionDigits }).format(Number(value) || 0);
  }

  formatPercent(value: number | null | undefined, signed = false): string {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) return '—';
    const numeric = Number(value);
    const prefix = signed && numeric > 0 ? '+' : '';
    return `${prefix}${new Intl.NumberFormat('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(numeric)}%`;
  }

  formatDate(value: string | null): string {
    if (!value) return '—';
    const parts = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(value) ?? /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    if (!parts) return value;
    const date = value.includes('/')
      ? new Date(Number(parts[3]), Number(parts[2]) - 1, Number(parts[1]))
      : new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]));
    return new Intl.DateTimeFormat('es-CR', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
  }

  barWidth(value: number | null | undefined): string {
    return `${Math.min(100, Math.max(0, Number(value) || 0))}%`;
  }
}
