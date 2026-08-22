import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { ErpKpiCardComponent } from 'src/app/theme/shared/components/erp-kpi-card/erp-kpi-card.component';
import {
  ComprasAnalisisFiltros,
  EstadoConsulta,
  RotacionDistribucion,
  RotacionHallazgo,
  RotacionProducto,
  RotacionResumen
} from '../../../interfaces/compras-reportes.interface';
import { ComprasReportesService } from '../../../services/compras-reportes.service';
import { formatDateForApi } from '../../../utils/compras-date.util';
import { getEtiquetaRangoTiempo, getRangoTiempo, RANGOS_TIEMPO_ROTACION } from '../../../utils/rotacion-analisis.util';
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

  readonly filtros = input<ComprasAnalisisFiltros | null>(null);
  readonly loadingChange = output<boolean>();
  readonly estado = signal<EstadoConsulta>('initial');
  readonly filas = signal<RotacionProducto[]>([]);
  readonly mensajeError = signal<string | null>(null);

  readonly contexto = computed(() => this.filas()[0] ?? null);
  readonly resumen = computed(() => this.buildResumen(this.filas()));
  readonly distribucion = computed(() => this.buildDistribucion(this.filas()));
  readonly comparacion = computed(() => this.filas()
    .filter((fila) => fila.diasPromedioInventario !== null && fila.diasPromedioInventario !== undefined)
    .slice()
    .sort((a, b) => (b.diasPromedioInventario ?? 0) - (a.diasPromedioInventario ?? 0))
    .slice(0, 10));
  readonly maximoComparacion = computed(() => Math.max(...this.comparacion().map((fila) => fila.diasPromedioInventario ?? 0), 1));
  readonly hallazgos = computed(() => this.buildHallazgos(this.filas()));

  constructor() {
    effect((onCleanup) => {
      const filtros = this.filtros();
      if (!filtros) return;
      this.estado.set('loading');
      this.filas.set([]);
      this.mensajeError.set(null);
      this.loadingChange.emit(true);

      // El endpoint de rotación no admite almacén; el filtro compartido se conserva para las otras perspectivas.
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
      onCleanup(() => {
        subscription.unsubscribe();
        this.loadingChange.emit(false);
      });
    });
  }

  formatNumber(value: number | null | undefined): string {
    return value === null || value === undefined
      ? '—'
      : new Intl.NumberFormat('es-CR', { maximumFractionDigits: 2 }).format(Number(value));
  }

  formatDays(value: number | null | undefined): string {
    return value === null || value === undefined ? '—' : `${this.formatNumber(value)} días`;
  }

  formatUnits(value: number): string {
    return `${this.formatNumber(value)} ${value === 1 ? 'unidad' : 'unidades'}`;
  }

  formatPercent(value: number): string {
    return `${new Intl.NumberFormat('es-CR', { maximumFractionDigits: 2 }).format(value)} %`;
  }

  formatDate(value: string | null | undefined): string {
    if (!value) return '—';
    const slash = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(value);
    const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    const date = slash ? new Date(+slash[3], +slash[2] - 1, +slash[1]) : iso ? new Date(+iso[1], +iso[2] - 1, +iso[3]) : null;
    return date ? new Intl.DateTimeFormat('es-CR', { day: '2-digit', month: 'short', year: 'numeric' }).format(date) : value;
  }

  comparisonWidth(value: number | null): string {
    return `${value === null ? 0 : Math.max(2, (value / this.maximoComparacion()) * 100)}%`;
  }

  private buildResumen(filas: readonly RotacionProducto[]): RotacionResumen {
    const unidadesVendidas = filas.reduce((total, fila) => total + (Number(fila.cantidadVendida) || 0), 0);
    const unidadesAnalizadas = filas.reduce((total, fila) => total + (Number(fila.cantidadVendidaAnalizada) || 0), 0);
    const unidadesNoAsignadas = filas.reduce((total, fila) => total + (Number(fila.cantidadNoAsignadaFIFO) || 0), 0);
    const productosConPromedio = filas.filter((fila) =>
      fila.diasPromedioInventario !== null &&
      fila.diasPromedioInventario !== undefined &&
      fila.cantidadVendidaAnalizada > 0
    );
    const unidadesConPromedio = productosConPromedio.reduce((total, fila) => total + fila.cantidadVendidaAnalizada, 0);
    const diasPonderados = productosConPromedio.reduce(
      (total, fila) => total + (fila.diasPromedioInventario ?? 0) * fila.cantidadVendidaAnalizada,
      0
    );

    return {
      productosAnalizados: filas.length,
      unidadesVendidas,
      unidadesAnalizadas,
      unidadesNoAsignadas,
      coberturaFIFOGlobal: unidadesVendidas > 0 ? (unidadesAnalizadas / unidadesVendidas) * 100 : 0,
      tiempoPromedioPonderado: unidadesConPromedio > 0 ? diasPonderados / unidadesConPromedio : null
    };
  }

  private buildDistribucion(filas: readonly RotacionProducto[]): RotacionDistribucion[] {
    const total = filas.length;
    const rangos = RANGOS_TIEMPO_ROTACION.filter((opcion) => opcion.valor !== 'TODOS');
    return rangos.map((opcion, index) => {
      const rango = opcion.valor as Exclude<typeof opcion.valor, 'TODOS'>;
      const cantidad = filas.filter((fila) => getRangoTiempo(fila.diasPromedioInventario) === rango).length;
      return {
        rango,
        etiqueta: getEtiquetaRangoTiempo(rango),
        cantidad,
        porcentaje: total > 0 ? (cantidad / total) * 100 : 0,
        tone: index === rangos.length - 1 ? 'neutral' : index < 2 ? 'primary' : 'info'
      };
    });
  }

  private buildHallazgos(filas: readonly RotacionProducto[]): RotacionHallazgo[] {
    const hallazgos: RotacionHallazgo[] = [];
    const incluidos = new Set<string>();
    const agregar = (fila: RotacionProducto, hallazgo: RotacionHallazgo): void => {
      if (hallazgos.length < 5 && !incluidos.has(fila.codProducto)) {
        hallazgos.push(hallazgo);
        incluidos.add(fila.codProducto);
      }
    };

    filas
      .filter((fila) => fila.porcentajeCoberturaFIFO < 100)
      .slice()
      .sort((a, b) => b.cantidadNoAsignadaFIFO - a.cantidadNoAsignadaFIFO)
      .forEach((fila) => agregar(fila, {
        tipo: fila.producto?.trim() || fila.codProducto,
        mensaje: `Cobertura FIFO: ${this.formatPercent(fila.porcentajeCoberturaFIFO)}. ${this.formatNumber(fila.cantidadNoAsignadaFIFO)} de ${this.formatNumber(fila.cantidadVendida)} unidades no pudieron trazarse.`,
        tone: 'warning',
        icono: 'feather icon-alert-circle'
      }));

    filas
      .filter((fila) => (fila.diasPromedioInventario ?? 0) > 30 && fila.cantidadVendidaAnalizada <= 5)
      .slice()
      .sort((a, b) => (b.diasPromedioInventario ?? 0) - (a.diasPromedioInventario ?? 0))
      .forEach((fila) => agregar(fila, {
        tipo: fila.producto?.trim() || fila.codProducto,
        mensaje: `${this.formatDays(fila.diasPromedioInventario)} promedio, pero solo ${this.formatUnits(fila.cantidadVendidaAnalizada)} ${fila.cantidadVendidaAnalizada === 1 ? 'analizada' : 'analizadas'}. Interpretar con cautela por el tamaño de la muestra.`,
        tone: 'info',
        icono: 'feather icon-info'
      }));

    filas
      .filter((fila) => (fila.diasPromedioInventario ?? 0) > 15 && fila.cantidadVendidaAnalizada >= 20)
      .slice()
      .sort((a, b) => (b.diasPromedioInventario ?? 0) - (a.diasPromedioInventario ?? 0))
      .forEach((fila) => agregar(fila, {
        tipo: fila.producto?.trim() || fila.codProducto,
        mensaje: `${this.formatUnits(fila.cantidadVendidaAnalizada)} ${fila.cantidadVendidaAnalizada === 1 ? 'analizada' : 'analizadas'} con ${this.formatDays(fila.diasPromedioInventario)} promedio.`,
        tone: 'info',
        icono: 'feather icon-bar-chart-2'
      }));

    return hallazgos;
  }

  private handleError(error: HttpErrorResponse): void {
    this.filas.set([]);
    if (error.status === 404) {
      this.estado.set('empty');
      return;
    }
    this.mensajeError.set(error.status === 400
      ? this.safeBackendMessage(error) || 'Revise los filtros seleccionados.'
      : 'No fue posible obtener el análisis de rotación. Intente nuevamente.');
    this.estado.set('error');
  }

  private safeBackendMessage(error: HttpErrorResponse): string | null {
    if (!error.error || typeof error.error !== 'object') return null;
    const payload = error.error as Record<string, unknown>;
    const message = payload['message'] ?? payload['mensaje'] ?? payload['respuesta'];
    return typeof message === 'string' && message.length <= 240 ? message : null;
  }
}
