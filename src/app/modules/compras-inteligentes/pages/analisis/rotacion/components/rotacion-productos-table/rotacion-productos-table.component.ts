import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { RangoTiempoRotacion, RotacionProducto } from '../../../../../interfaces/compras-reportes.interface';
import { getRangoTiempo, RANGOS_TIEMPO_ROTACION } from '../../../../../utils/rotacion-analisis.util';

type CampoOrden =
  | 'cantidadVendida'
  | 'porcentajeCoberturaFIFO'
  | 'diasPromedioInventario'
  | 'diasMinimoInventario'
  | 'diasMaximoInventario'
  | 'fechaUltimaVenta'
  | 'diasInventarioUltimaVenta';

@Component({
  selector: 'app-rotacion-productos-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rotacion-productos-table.component.html',
  styleUrls: ['./rotacion-productos-table.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RotacionProductosTableComponent {
  readonly filas = input.required<readonly RotacionProducto[]>();
  readonly busqueda = signal('');
  readonly rango = signal<RangoTiempoRotacion>('TODOS');
  readonly campoOrden = signal<CampoOrden>('diasPromedioInventario');
  readonly direccion = signal<'asc' | 'desc'>('desc');
  readonly expandido = signal<string | null>(null);
  readonly rangos = RANGOS_TIEMPO_ROTACION;

  readonly filasVisibles = computed(() => {
    const term = this.busqueda().trim().toLocaleLowerCase('es');
    const rango = this.rango();
    const campo = this.campoOrden();
    const factor = this.direccion() === 'asc' ? 1 : -1;
    return this.filas()
      .filter((fila) => {
        const codigo = fila.codProducto.toLocaleLowerCase('es');
        const nombre = (fila.producto ?? '').toLocaleLowerCase('es');
        return !term || codigo.includes(term) || nombre.includes(term);
      })
      .filter((fila) => rango === 'TODOS' || getRangoTiempo(fila.diasPromedioInventario) === rango)
      .slice()
      .sort((a, b) => this.comparar(a, b, campo) * factor);
  });

  actualizarBusqueda(event: Event): void {
    this.busqueda.set((event.target as HTMLInputElement).value);
  }

  seleccionarRango(rango: RangoTiempoRotacion): void {
    this.rango.set(rango);
  }

  alternarDetalle(codigo: string): void {
    this.expandido.update((value) => value === codigo ? null : codigo);
  }

  ordenar(campo: CampoOrden): void {
    if (this.campoOrden() === campo) {
      this.direccion.update((value) => value === 'asc' ? 'desc' : 'asc');
    } else {
      this.campoOrden.set(campo);
      this.direccion.set('desc');
    }
  }

  iconoOrden(campo: CampoOrden): string {
    return this.campoOrden() === campo ? (this.direccion() === 'asc' ? '↑' : '↓') : '';
  }

  formatNumber(value: number | null | undefined): string {
    return value === null || value === undefined
      ? '—'
      : new Intl.NumberFormat('es-CR', { maximumFractionDigits: 2 }).format(Number(value));
  }

  formatDays(value: number | null | undefined): string {
    return value === null || value === undefined ? '—' : `${this.formatNumber(value)} días`;
  }

  formatPercent(value: number | null | undefined): string {
    return value === null || value === undefined
      ? '—'
      : `${new Intl.NumberFormat('es-CR', { maximumFractionDigits: 2 }).format(value)} %`;
  }

  formatDate(value: string | null | undefined): string {
    if (!value) return '—';
    const slash = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(value);
    const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    const date = slash ? new Date(+slash[3], +slash[2] - 1, +slash[1]) : iso ? new Date(+iso[1], +iso[2] - 1, +iso[3]) : null;
    return date ? new Intl.DateTimeFormat('es-CR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date) : value;
  }

  formatRangoDias(minimo: number | null | undefined, maximo: number | null | undefined): string {
    if (minimo === null || minimo === undefined || maximo === null || maximo === undefined) return '—';
    return minimo === maximo ? this.formatDays(minimo) : `${this.formatNumber(minimo)} – ${this.formatNumber(maximo)} días`;
  }

  formatRangoCompras(antigua: string | null | undefined, reciente: string | null | undefined): string {
    if (!antigua && !reciente) return '—';
    if (!antigua) return this.formatDate(reciente);
    if (!reciente || antigua.slice(0, 10) === reciente.slice(0, 10)) return this.formatDate(antigua);
    return `${this.formatDate(antigua)} – ${this.formatDate(reciente)}`;
  }

  coberturaTooltip(fila: RotacionProducto): string {
    const sujeto = fila.cantidadVendida === 1 ? 'unidad pudo' : 'unidades pudieron';
    return `${this.formatNumber(fila.cantidadVendidaAnalizada)} de ${this.formatNumber(fila.cantidadVendida)} ${sujeto} asociarse a compras mediante FIFO.`;
  }

  private comparar(a: RotacionProducto, b: RotacionProducto, campo: CampoOrden): number {
    const valorA = this.valorOrden(a, campo);
    const valorB = this.valorOrden(b, campo);
    if (valorA === null && valorB === null) return 0;
    if (valorA === null) return this.direccion() === 'asc' ? 1 : -1;
    if (valorB === null) return this.direccion() === 'asc' ? -1 : 1;
    return valorA - valorB;
  }

  private valorOrden(fila: RotacionProducto, campo: CampoOrden): number | null {
    const valor = fila[campo];
    if (valor === null || valor === undefined) return null;
    if (campo === 'fechaUltimaVenta') {
      const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(valor));
      return iso ? Number(`${iso[1]}${iso[2]}${iso[3]}`) : null;
    }
    return Number(valor);
  }
}
