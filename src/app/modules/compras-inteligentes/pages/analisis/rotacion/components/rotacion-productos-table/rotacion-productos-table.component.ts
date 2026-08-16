import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NivelRotacion, RotacionProducto } from '../../../../../interfaces/compras-reportes.interface';

type FiltroNivel = 'TODOS' | NivelRotacion;
type CampoOrden = 'cantidadVendida' | 'diasPromedioInventario' | 'diasMinimoInventario' | 'diasMaximoInventario' | 'diasInventarioUltimaVenta' | 'existenciaActual';

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
  readonly nivel = signal<FiltroNivel>('TODOS');
  readonly soloStockNegativo = signal(false);
  readonly campoOrden = signal<CampoOrden>('diasPromedioInventario');
  readonly direccion = signal<'asc' | 'desc'>('desc');
  readonly expandido = signal<string | null>(null);
  readonly niveles: readonly FiltroNivel[] = ['TODOS', 'MUY RAPIDA', 'RAPIDA', 'NORMAL', 'LENTA', 'MUY LENTA', 'SIN DATOS'];

  readonly filasVisibles = computed(() => {
    const term = this.busqueda().trim().toLocaleLowerCase('es');
    const nivel = this.nivel();
    const campo = this.campoOrden();
    const factor = this.direccion() === 'asc' ? 1 : -1;
    return this.filas()
      .filter((fila) => !term || fila.codProducto.toLocaleLowerCase('es').includes(term) || fila.producto.toLocaleLowerCase('es').includes(term))
      .filter((fila) => nivel === 'TODOS' || fila.nivelRotacion === nivel)
      .filter((fila) => !this.soloStockNegativo() || fila.existenciaActual < 0)
      .slice()
      .sort((a, b) => ((a[campo] ?? Number.NEGATIVE_INFINITY) - (b[campo] ?? Number.NEGATIVE_INFINITY)) * factor);
  });

  actualizarBusqueda(event: Event): void { this.busqueda.set((event.target as HTMLInputElement).value); }
  actualizarStockNegativo(event: Event): void { this.soloStockNegativo.set((event.target as HTMLInputElement).checked); }
  seleccionarNivel(nivel: FiltroNivel): void { this.nivel.set(nivel); }
  alternarDetalle(codigo: string): void { this.expandido.update((value) => value === codigo ? null : codigo); }

  ordenar(campo: CampoOrden): void {
    if (this.campoOrden() === campo) this.direccion.update((value) => value === 'asc' ? 'desc' : 'asc');
    else { this.campoOrden.set(campo); this.direccion.set('desc'); }
  }

  iconoOrden(campo: CampoOrden): string { return this.campoOrden() === campo ? (this.direccion() === 'asc' ? '↑' : '↓') : ''; }
  formatNumber(value: number | null | undefined): string { return value === null || value === undefined ? '—' : new Intl.NumberFormat('es-CR', { maximumFractionDigits: 2 }).format(Number(value)); }
  formatDays(value: number | null | undefined): string { return value === null || value === undefined ? '—' : `${this.formatNumber(value)} días`; }

  formatDate(value: string | null): string {
    if (!value) return '—';
    const slash = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(value);
    const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    const date = slash ? new Date(+slash[3], +slash[2] - 1, +slash[1]) : iso ? new Date(+iso[1], +iso[2] - 1, +iso[3]) : null;
    return date ? new Intl.DateTimeFormat('es-CR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date) : value;
  }

  nivelTone(nivel: NivelRotacion): string {
    if (nivel === 'MUY RAPIDA' || nivel === 'RAPIDA') return 'success';
    if (nivel === 'NORMAL') return 'neutral';
    if (nivel === 'LENTA') return 'warning';
    if (nivel === 'MUY LENTA') return 'danger';
    return 'info';
  }
}

