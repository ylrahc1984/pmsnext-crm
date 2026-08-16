import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ErpKpiCardComponent } from 'src/app/theme/shared/components/erp-kpi-card/erp-kpi-card.component';
import {
  ComprasAnalisisFiltros,
  EstadoConsulta,
  NivelRotacion,
  RotacionDistribucion,
  RotacionHallazgo,
  RotacionProducto,
  RotacionResumen
} from '../../../interfaces/compras-reportes.interface';
import { ComprasReportesService } from '../../../services/compras-reportes.service';
import { formatDateForApi } from '../../../utils/compras-date.util';
import { RotacionProductosTableComponent } from './components/rotacion-productos-table/rotacion-productos-table.component';

@Component({
  selector: 'app-rotacion-analisis',
  standalone: true,
  imports: [CommonModule, ErpKpiCardComponent, RotacionProductosTableComponent],
  templateUrl: './rotacion-analisis.component.html',
  styleUrls: ['./rotacion-analisis.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RotacionAnalisisComponent {
  private readonly service = inject(ComprasReportesService);
  private readonly niveles: readonly NivelRotacion[] = ['MUY RAPIDA', 'RAPIDA', 'NORMAL', 'LENTA', 'MUY LENTA', 'SIN DATOS'];

  readonly filtros = input<ComprasAnalisisFiltros | null>(null);
  readonly loadingChange = output<boolean>();
  readonly estado = signal<EstadoConsulta>('initial');
  readonly filas = signal<RotacionProducto[]>([]);
  readonly mensajeError = signal<string | null>(null);

  readonly contexto = computed(() => this.filas()[0] ?? null);
  readonly resumen = computed(() => this.buildResumen(this.filas()));
  readonly distribucion = computed(() => this.buildDistribucion(this.filas()));
  readonly productosLentos = computed(() => this.filas()
    .filter((fila) => fila.nivelRotacion === 'LENTA' || fila.nivelRotacion === 'MUY LENTA')
    .slice().sort((a, b) => (b.diasPromedioInventario ?? -1) - (a.diasPromedioInventario ?? -1)));
  readonly comparacion = computed(() => this.filas().slice()
    .sort((a, b) => (b.diasPromedioInventario ?? -1) - (a.diasPromedioInventario ?? -1)).slice(0, 10));
  readonly maximoComparacion = computed(() => Math.max(...this.comparacion().map((fila) => fila.diasPromedioInventario ?? 0), 1));
  readonly hallazgos = computed(() => this.buildHallazgos(this.filas(), this.resumen()));

  constructor() {
    effect((onCleanup) => {
      const filtros = this.filtros();
      if (!filtros) return;
      this.estado.set('loading');
      this.filas.set([]);
      this.mensajeError.set(null);
      this.loadingChange.emit(true);

      // El endpoint de rotación no admite almacén.
      const subscription = this.service.getRotacionProductos({
        fechaDesde: formatDateForApi(filtros.fechaDesde),
        fechaHasta: formatDateForApi(filtros.fechaHasta),
        codProveedor: filtros.codProveedor,
        codProducto: filtros.codProducto
      }).subscribe({
        next: (response) => {
          const filas = response?.data ?? [];
          if (!response?.success && filas.length === 0) {
            this.mensajeError.set(response?.message || 'No fue posible obtener el análisis de rotación.');
            this.estado.set('error');
          } else {
            this.filas.set(filas);
            this.estado.set(filas.length ? 'data' : 'empty');
          }
          this.loadingChange.emit(false);
        },
        error: (error: HttpErrorResponse) => {
          this.handleError(error);
          this.loadingChange.emit(false);
        }
      });
      onCleanup(() => { subscription.unsubscribe(); this.loadingChange.emit(false); });
    });
  }

  formatNumber(value: number | null | undefined): string {
    return value === null || value === undefined ? '—' : new Intl.NumberFormat('es-CR', { maximumFractionDigits: 2 }).format(Number(value));
  }
  formatDays(value: number | null | undefined): string { return value === null || value === undefined ? '—' : `${this.formatNumber(value)} días`; }
  formatPercent(value: number): string { return `${new Intl.NumberFormat('es-CR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value)}%`; }

  formatDate(value: string | null | undefined): string {
    if (!value) return '—';
    const slash = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(value);
    const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    const date = slash ? new Date(+slash[3], +slash[2] - 1, +slash[1]) : iso ? new Date(+iso[1], +iso[2] - 1, +iso[3]) : null;
    return date ? new Intl.DateTimeFormat('es-CR', { day: '2-digit', month: 'short', year: 'numeric' }).format(date) : value;
  }

  nivelTone(nivel: NivelRotacion): string {
    if (nivel === 'MUY RAPIDA' || nivel === 'RAPIDA') return 'success';
    if (nivel === 'NORMAL') return 'neutral';
    if (nivel === 'LENTA') return 'warning';
    if (nivel === 'MUY LENTA') return 'danger';
    return 'info';
  }

  comparisonWidth(value: number | null): string {
    return `${Math.max(2, ((value ?? 0) / this.maximoComparacion()) * 100)}%`;
  }

  private buildResumen(filas: readonly RotacionProducto[]): RotacionResumen {
    return filas.reduce((acc, fila) => {
      acc.unidadesVendidas += Number(fila.cantidadVendida) || 0;
      if (fila.nivelRotacion === 'LENTA' || fila.nivelRotacion === 'MUY LENTA') acc.productosLentos += 1;
      if (fila.nivelRotacion === 'RAPIDA' || fila.nivelRotacion === 'MUY RAPIDA') acc.productosRapidos += 1;
      if (fila.nivelRotacion === 'MUY LENTA') acc.productosMuyLentos += 1;
      if (fila.existenciaActual < 0) acc.productosStockNegativo += 1;
      return acc;
    }, { productosAnalizados: filas.length, unidadesVendidas: 0, productosLentos: 0, productosRapidos: 0, productosMuyLentos: 0, productosStockNegativo: 0 });
  }

  private buildDistribucion(filas: readonly RotacionProducto[]): RotacionDistribucion[] {
    const total = filas.length || 1;
    return this.niveles.map((nivel) => {
      const cantidad = filas.filter((fila) => fila.nivelRotacion === nivel).length;
      return { nivel, cantidad, porcentaje: (cantidad / total) * 100, tone: this.nivelTone(nivel) as RotacionDistribucion['tone'] };
    });
  }

  private buildHallazgos(filas: readonly RotacionProducto[], resumen: RotacionResumen): RotacionHallazgo[] {
    const hallazgos: RotacionHallazgo[] = [];
    if (resumen.productosMuyLentos > 0) hallazgos.push({ tipo: 'Rotación muy lenta', mensaje: `${resumen.productosMuyLentos} productos presentan rotación muy lenta.`, tone: 'warning', icono: 'feather icon-clock' });
    if (resumen.productosLentos > 0) hallazgos.push({ tipo: 'Rotación lenta', mensaje: `${resumen.productosLentos} productos presentan rotación lenta o muy lenta.`, tone: 'warning', icono: 'feather icon-trending-down' });
    const muyRapidos = filas.filter((fila) => fila.nivelRotacion === 'MUY RAPIDA').length;
    if (muyRapidos > 0) hallazgos.push({ tipo: 'Rotación muy rápida', mensaje: `${muyRapidos} productos presentan rotación muy rápida.`, tone: 'success', icono: 'feather icon-zap' });
    filas.filter((fila) => fila.existenciaActual < 0).forEach((fila) => hallazgos.push({ tipo: 'Stock negativo', mensaje: `${fila.producto.trim()} presenta existencia negativa (${this.formatNumber(fila.existenciaActual)}).`, tone: 'danger', icono: 'feather icon-alert-triangle' }));
    return hallazgos;
  }

  private handleError(error: HttpErrorResponse): void {
    this.filas.set([]);
    if (error.status === 404) { this.estado.set('empty'); return; }
    this.mensajeError.set(error.status === 400 ? this.safeBackendMessage(error) || 'Revise los filtros seleccionados.' : 'No fue posible obtener el análisis de rotación. Intente nuevamente.');
    this.estado.set('error');
  }

  private safeBackendMessage(error: HttpErrorResponse): string | null {
    if (!error.error || typeof error.error !== 'object') return null;
    const payload = error.error as Record<string, unknown>;
    const message = payload['message'] ?? payload['mensaje'] ?? payload['respuesta'];
    return typeof message === 'string' && message.length <= 240 ? message : null;
  }
}

