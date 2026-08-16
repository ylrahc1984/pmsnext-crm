import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ErpKpiCardComponent } from 'src/app/theme/shared/components/erp-kpi-card/erp-kpi-card.component';
import {
  AnaliticoComprasProveedor,
  CompraCambioRelevante,
  CompraEstadoResumen,
  ComprasAnalisisFiltros,
  ComprasProveedorResumen,
  EstadoConsulta
} from '../../../interfaces/compras-reportes.interface';
import { ComprasReportesService } from '../../../services/compras-reportes.service';
import { formatDateForApi } from '../../../utils/compras-date.util';
import { ComprasProductosTableComponent } from './components/compras-productos-table/compras-productos-table.component';

@Component({
  selector: 'app-compras-analisis-perspectiva',
  standalone: true,
  imports: [CommonModule, ErpKpiCardComponent, ComprasProductosTableComponent],
  templateUrl: './compras-analisis.component.html',
  styleUrls: ['./compras-analisis.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ComprasAnalisisComponent {
  private readonly service = inject(ComprasReportesService);

  readonly filtros = input<ComprasAnalisisFiltros | null>(null);
  readonly loadingChange = output<boolean>();
  readonly estado = signal<EstadoConsulta>('initial');
  readonly filas = signal<AnaliticoComprasProveedor[]>([]);
  readonly mensajeError = signal<string | null>(null);
  readonly mostrarTodosCostos = signal(false);
  readonly mostrarTodaDistribucion = signal(false);

  readonly contexto = computed(() => this.filas()[0] ?? null);
  readonly resumen = computed(() => this.buildResumen(this.filas()));
  readonly estados = computed(() => this.buildEstados(this.filas()));
  readonly costos = computed(() => {
    const ordenados = this.filas()
      .filter((fila) => fila.costoPromedio !== null || fila.costoPromedioAnterior !== null)
      .slice()
      .sort((a, b) => Math.abs(b.variacionCostoPromedio ?? 0) - Math.abs(a.variacionCostoPromedio ?? 0));
    return this.mostrarTodosCostos() ? ordenados : ordenados.slice(0, 5);
  });
  readonly distribucion = computed(() => {
    const ordenados = this.filas().slice().sort((a, b) => b.participacionProveedor - a.participacionProveedor);
    return this.mostrarTodaDistribucion() ? ordenados : ordenados.slice(0, 5);
  });
  readonly cambiosRelevantes = computed(() => this.buildCambios(this.filas()).slice(0, 5));

  constructor() {
    effect((onCleanup) => {
      const filtros = this.filtros();
      if (!filtros) return;
      this.estado.set('loading');
      this.filas.set([]);
      this.mensajeError.set(null);
      this.mostrarTodosCostos.set(false);
      this.mostrarTodaDistribucion.set(false);
      this.loadingChange.emit(true);

      const subscription = this.service.getAnaliticoComprasProveedor({
        fechaDesde: formatDateForApi(filtros.fechaDesde),
        fechaHasta: formatDateForApi(filtros.fechaHasta),
        codProveedor: filtros.codProveedor,
        codProducto: filtros.codProducto,
        almacen: filtros.almacen
      }).subscribe({
        next: (response) => {
          const filas = response?.data ?? [];
          if (!response?.success && filas.length === 0) {
            this.mensajeError.set(response?.message || 'No fue posible generar el análisis de compras.');
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

  alternarCostos(): void { this.mostrarTodosCostos.update((value) => !value); }
  alternarDistribucion(): void { this.mostrarTodaDistribucion.update((value) => !value); }

  variacionCompraLabel(): string {
    const resumen = this.resumen();
    if (resumen.comparacionCompra === 'nueva') return 'Nueva compra';
    if (resumen.comparacionCompra === 'sin-datos') return 'Sin período comparable';
    return this.formatPercent(resumen.variacionCompraGlobal, true);
  }

  formatCurrency(value: number | null | undefined): string {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) return '—';
    return new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value));
  }

  formatNumber(value: number | null | undefined): string {
    return new Intl.NumberFormat('es-CR', { maximumFractionDigits: 2 }).format(Number(value) || 0);
  }

  formatPercent(value: number | null | undefined, signed = false): string {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) return '—';
    const numeric = Number(value);
    return `${signed && numeric > 0 ? '+' : ''}${new Intl.NumberFormat('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(numeric)}%`;
  }

  formatDate(value: string | null | undefined): string {
    if (!value) return '—';
    const slash = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(value);
    const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    const date = slash ? new Date(+slash[3], +slash[2] - 1, +slash[1]) : iso ? new Date(+iso[1], +iso[2] - 1, +iso[3]) : null;
    return date ? new Intl.DateTimeFormat('es-CR', { day: '2-digit', month: 'short', year: 'numeric' }).format(date) : value;
  }

  barWidth(value: number): string { return `${Math.min(100, Math.max(0, Number(value) || 0))}%`; }
  variacionIcono(value: number | null): string { return value === null || value === 0 ? '' : value > 0 ? '↑' : '↓'; }
  costoTone(value: number | null): string { return value === null || value === 0 ? 'neutral' : value > 0 ? 'attention' : 'favorable'; }

  private buildResumen(filas: readonly AnaliticoComprasProveedor[]): ComprasProveedorResumen {
    const resumen = filas.reduce((acc, fila) => {
      acc.netoComprado += Number(fila.netoComprado) || 0;
      acc.netoAnterior += Number(fila.netoAnterior) || 0;
      acc.unidadesCompradas += Number(fila.cantidadComprada) || 0;
      acc.impuestos += Number(fila.impuestoComprado) || 0;
      acc.compraTotal += Number(fila.totalComprado) || 0;
      acc.numeroCompras += Number(fila.numeroCompras) || 0;
      if ((Number(fila.cantidadComprada) || 0) > 0) acc.productosComprados += 1;
      return acc;
    }, {
      netoComprado: 0, netoAnterior: 0, unidadesCompradas: 0, productosComprados: 0,
      productosSinCompra: 0, totalProductos: filas.length, variacionCompraGlobal: null,
      comparacionCompra: 'sin-datos', impuestos: 0, compraTotal: 0, numeroCompras: 0
    } as ComprasProveedorResumen);

    resumen.productosSinCompra = resumen.totalProductos - resumen.productosComprados;
    if (resumen.netoAnterior > 0) {
      resumen.variacionCompraGlobal = ((resumen.netoComprado - resumen.netoAnterior) / resumen.netoAnterior) * 100;
      resumen.comparacionCompra = 'comparable';
    } else if (resumen.netoComprado > 0) {
      resumen.comparacionCompra = 'nueva';
    }
    return resumen;
  }

  private buildEstados(filas: readonly AnaliticoComprasProveedor[]): CompraEstadoResumen[] {
    const counts = new Map<string, number>();
    filas.forEach((fila) => {
      const estado = fila.estadoComparativo.trim().toUpperCase() || 'SIN CLASIFICAR';
      counts.set(estado, (counts.get(estado) ?? 0) + 1);
    });
    const definitions: Record<string, Omit<CompraEstadoResumen, 'estado' | 'cantidad'>> = {
      'COMPRA ESTABLE': { etiqueta: 'Estable', tone: 'success', icono: '↔' },
      'DISMINUCION DE COMPRA': { etiqueta: 'Disminución', tone: 'warning', icono: '↓' },
      'SIN COMPRA ANTERIOR': { etiqueta: 'Nueva compra', tone: 'info', icono: '+' },
      'SIN COMPRA ACTUAL': { etiqueta: 'Sin compra actual', tone: 'neutral', icono: '○' }
    };
    return [...counts.entries()].map(([estado, cantidad]) => ({
      estado,
      cantidad,
      ...(definitions[estado] ?? { etiqueta: estado, tone: 'neutral' as const, icono: '•' })
    }));
  }

  private buildCambios(filas: readonly AnaliticoComprasProveedor[]): CompraCambioRelevante[] {
    return filas.map<CompraCambioRelevante>((fila) => {
      const estado = fila.estadoComparativo.trim().toUpperCase();
      if (estado === 'SIN COMPRA ACTUAL') {
        return { codProducto: fila.codProducto, producto: fila.producto, tipo: 'Sin compra actual', detalle: `${this.formatNumber(fila.cantidadAnterior)} → 0 unidades`, variacion: fila.variacionCantidad, tone: 'neutral', relevancia: 1000 };
      }
      if (estado === 'SIN COMPRA ANTERIOR') {
        return { codProducto: fila.codProducto, producto: fila.producto, tipo: 'Nueva compra', detalle: `${this.formatNumber(fila.cantidadComprada)} unidades adquiridas`, variacion: fila.variacionCantidad, tone: 'info', relevancia: 900 };
      }
      const costChange = Math.abs(fila.variacionCostoPromedio ?? 0);
      const quantityChange = Math.abs(fila.variacionCantidad ?? 0);
      if (costChange >= quantityChange && fila.variacionCostoPromedio !== null && fila.variacionCostoPromedio !== 0) {
        return { codProducto: fila.codProducto, producto: fila.producto, tipo: 'Cambio de costo', detalle: `${this.formatCurrency(fila.costoPromedioAnterior)} → ${this.formatCurrency(fila.costoPromedio)}`, variacion: fila.variacionCostoPromedio, tone: fila.variacionCostoPromedio > 0 ? 'warning' : 'info', relevancia: costChange };
      }
      return { codProducto: fila.codProducto, producto: fila.producto, tipo: (fila.variacionCantidad ?? 0) < 0 ? 'Disminución de compra' : 'Aumento de compra', detalle: `${this.formatNumber(fila.cantidadAnterior)} → ${this.formatNumber(fila.cantidadComprada)} unidades`, variacion: fila.variacionCantidad, tone: 'neutral', relevancia: quantityChange };
    }).filter((cambio) => cambio.relevancia > 0).sort((a, b) => b.relevancia - a.relevancia);
  }

  private handleError(error: HttpErrorResponse): void {
    this.filas.set([]);
    if (error.status === 404) { this.estado.set('empty'); return; }
    this.mensajeError.set(error.status === 400 ? this.safeBackendMessage(error) || 'Revise los filtros seleccionados.' : 'No fue posible generar el análisis de compras. Intente nuevamente.');
    this.estado.set('error');
  }

  private safeBackendMessage(error: HttpErrorResponse): string | null {
    if (!error.error || typeof error.error !== 'object') return null;
    const payload = error.error as Record<string, unknown>;
    const message = payload['message'] ?? payload['mensaje'] ?? payload['respuesta'];
    return typeof message === 'string' && message.length <= 240 ? message : null;
  }
}
