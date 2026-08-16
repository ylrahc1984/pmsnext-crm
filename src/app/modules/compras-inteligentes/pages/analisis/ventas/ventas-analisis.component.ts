import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ErpKpiCardComponent } from 'src/app/theme/shared/components/erp-kpi-card/erp-kpi-card.component';
import { AnaliticoVentasProveedor, ComprasAnalisisFiltros, EstadoConsulta, VentasProveedorResumen } from '../../../interfaces/compras-reportes.interface';
import { ComprasReportesService } from '../../../services/compras-reportes.service';
import { formatDateForApi } from '../../../utils/compras-date.util';
import { VentasProductosTableComponent } from './components/ventas-productos-table/ventas-productos-table.component';

@Component({
  selector: 'app-ventas-analisis',
  standalone: true,
  imports: [CommonModule, ErpKpiCardComponent, VentasProductosTableComponent],
  templateUrl: './ventas-analisis.component.html',
  styleUrls: ['./ventas-analisis.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VentasAnalisisComponent {
  private readonly service = inject(ComprasReportesService);

  readonly filtros = input<ComprasAnalisisFiltros | null>(null);
  readonly loadingChange = output<boolean>();
  readonly estado = signal<EstadoConsulta>('initial');
  readonly filas = signal<AnaliticoVentasProveedor[]>([]);
  readonly mensajeError = signal<string | null>(null);
  readonly mostrarTodaParticipacion = signal(false);

  readonly contexto = computed(() => this.filas()[0] ?? null);
  readonly resumen = computed(() => this.buildResumen(this.filas()));
  readonly participacion = computed(() => {
    const ordenadas = this.filas().slice().sort((a, b) => b.participacionProveedor - a.participacionProveedor);
    return this.mostrarTodaParticipacion() ? ordenadas : ordenadas.slice(0, 5);
  });

  constructor() {
    effect((onCleanup) => {
      const filtros = this.filtros();
      if (!filtros) return;

      this.estado.set('loading');
      this.filas.set([]);
      this.mensajeError.set(null);
      this.mostrarTodaParticipacion.set(false);
      this.loadingChange.emit(true);

      const subscription = this.service.getAnaliticoVentasProveedor({
        fechaDesde: formatDateForApi(filtros.fechaDesde),
        fechaHasta: formatDateForApi(filtros.fechaHasta),
        codProveedor: filtros.codProveedor,
        codProducto: filtros.codProducto,
        almacen: filtros.almacen,
        proveedorHistorico: filtros.proveedorHistorico ? 1 : 0
      }).subscribe({
        next: (response) => {
          const filas = response?.data ?? [];
          if (!response?.success && filas.length === 0) {
            this.mensajeError.set(response?.message || 'No fue posible generar el análisis de ventas.');
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

  formatCurrency(value: number | null | undefined): string {
    return new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(Number(value) || 0);
  }

  formatNumber(value: number | null | undefined): string {
    return new Intl.NumberFormat('es-CR', { maximumFractionDigits: 2 }).format(Number(value) || 0);
  }

  formatPercent(value: number | null | undefined): string {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) return '—';
    return `${new Intl.NumberFormat('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value))}%`;
  }

  formatDate(value: string | null | undefined): string {
    if (!value) return '—';
    const slash = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(value);
    const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    const date = slash
      ? new Date(Number(slash[3]), Number(slash[2]) - 1, Number(slash[1]))
      : iso ? new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])) : null;
    return date
      ? new Intl.DateTimeFormat('es-CR', { day: '2-digit', month: 'short', year: 'numeric' }).format(date)
      : value;
  }

  barWidth(value: number): string {
    return `${Math.min(100, Math.max(0, Number(value) || 0))}%`;
  }

  alternarParticipacion(): void {
    this.mostrarTodaParticipacion.update((value) => !value);
  }

  private buildResumen(filas: readonly AnaliticoVentasProveedor[]): VentasProveedorResumen {
    const base = filas.reduce((resumen, fila) => {
      resumen.ventasNetas += Number(fila.ventaNeta) || 0;
      resumen.unidadesVendidas += Number(fila.cantidadNeta) || 0;
      resumen.margenNeto += Number(fila.margenNeto) || 0;
      if ((Number(fila.cantidadNeta) || 0) > 0) resumen.productosConVenta += 1;
      const estado = fila.estadoComparativo.trim().toUpperCase();
      if (estado === 'CRECIENDO') resumen.productosCreciendo += 1;
      if (estado === 'DISMINUYENDO') resumen.productosDisminuyendo += 1;
      if (estado === 'SIN VENTA ACTUAL') resumen.productosSinVentaActual += 1;
      return resumen;
    }, {
      ventasNetas: 0, unidadesVendidas: 0, margenNeto: 0, margenPorcentajeGlobal: null,
      totalProductos: filas.length, productosConVenta: 0, productosSinVenta: 0,
      productosCreciendo: 0, productosDisminuyendo: 0, productosSinVentaActual: 0
    } as VentasProveedorResumen);

    base.productosSinVenta = base.totalProductos - base.productosConVenta;
    base.margenPorcentajeGlobal = base.ventasNetas === 0 ? null : (base.margenNeto / base.ventasNetas) * 100;
    return base;
  }

  private handleError(error: HttpErrorResponse): void {
    this.filas.set([]);
    if (error.status === 404) {
      this.estado.set('empty');
      return;
    }
    if (error.status === 400) {
      this.mensajeError.set(this.safeBackendMessage(error) || 'Revise los criterios del análisis.');
    } else {
      this.mensajeError.set('No fue posible generar el análisis de ventas. Intente nuevamente.');
    }
    this.estado.set('error');
  }

  private safeBackendMessage(error: HttpErrorResponse): string | null {
    if (!error.error || typeof error.error !== 'object') return null;
    const payload = error.error as Record<string, unknown>;
    const message = payload['message'] ?? payload['mensaje'] ?? payload['respuesta'];
    return typeof message === 'string' && message.length <= 240 ? message : null;
  }
}
