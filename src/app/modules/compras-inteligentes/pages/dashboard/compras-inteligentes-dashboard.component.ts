import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { catchError, finalize, of } from 'rxjs';

import {
  AccionRecomendadaDto,
  DashboardInventarioDto,
  DashboardInventarioFiltros,
  DashboardKpisDto,
  EstadoInventarioDashboard,
  EstadoInventarioDto,
  NivelRiesgoDashboard,
  ProductoCriticoDto,
  ProveedorDashboardDto
} from '../../interfaces/compras-inteligentes-dashboard.interface';
import { ComprasInteligentesDashboardService } from '../../services/compras-inteligentes-dashboard.service';

type KpiTone = 'critical' | 'risk' | 'stockout' | 'stale' | 'overstock' | 'success' | 'capital' | 'inventory' | 'neutral';

interface ExecutiveKpi {
  id: string;
  label: string;
  value: string;
  icon: string;
  tone: KpiTone;
  tooltip: string;
}

interface EstadoChartSlice {
  estado: EstadoInventarioDashboard;
  cantidad: number;
  porcentaje: number;
  color: string;
}

const EMPTY_KPIS: DashboardKpisDto = {
  totalProductos: 0,
  valorInventarioTotal: 0,
  productosCriticos: 0,
  productosRiesgo: 0,
  productosSinStock: 0,
  productosSinRotacion: 0,
  productosSobreStock: 0,
  compraSugeridaTotal: 0,
  capitalComprometido: 0,
  diasInventarioPromedio: 0,
  fechaUltimaActualizacion: ''
};

const EMPTY_DASHBOARD: DashboardInventarioDto = {
  kpis: EMPTY_KPIS,
  accionesRecomendadas: [],
  productosCriticos: [],
  proveedores: [],
  categorias: [],
  estados: []
};

@Component({
  selector: 'app-compras-inteligentes-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './compras-inteligentes-dashboard.component.html',
  styleUrls: ['../compras-inteligentes-page.scss', './compras-inteligentes-dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ComprasInteligentesDashboardComponent implements OnInit {
  private readonly dashboardService = inject(ComprasInteligentesDashboardService);

  readonly topOptions = [10, 25, 50, 100] as const;
  readonly filtros = signal<DashboardInventarioFiltros>({
    codAlmacen: 'PRINCIP',
    topProductosCriticos: 10,
    topProveedores: 5,
    topCategorias: 5,
    topAcciones: 10
  });
  readonly dashboard = signal<DashboardInventarioDto>(EMPTY_DASHBOARD);
  readonly loading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly selectedAction = signal<AccionRecomendadaDto | null>(null);

  readonly kpis = computed<ExecutiveKpi[]>(() => {
    const kpis = this.dashboard().kpis;

    return [
      {
        id: 'totalProductos',
        label: 'Total productos',
        value: this.formatQuantity(kpis.totalProductos),
        icon: 'feather icon-package',
        tone: 'neutral',
        tooltip: 'Cantidad total de productos evaluados en el modelo analitico.'
      },
      {
        id: 'valorInventarioTotal',
        label: 'Valor inventario',
        value: this.formatCurrency(kpis.valorInventarioTotal),
        icon: 'feather icon-pie-chart',
        tone: 'inventory',
        tooltip: 'Valor financiero total del inventario disponible.'
      },
      {
        id: 'productosCriticos',
        label: 'Criticos',
        value: this.formatQuantity(kpis.productosCriticos),
        icon: 'feather icon-alert-octagon',
        tone: 'critical',
        tooltip: 'Productos con condicion critica que requieren accion inmediata.'
      },
      {
        id: 'productosRiesgo',
        label: 'En riesgo',
        value: this.formatQuantity(kpis.productosRiesgo),
        icon: 'feather icon-alert-triangle',
        tone: 'risk',
        tooltip: 'Productos con deterioro operativo o financiero probable.'
      },
      {
        id: 'productosSinStock',
        label: 'Sin stock',
        value: this.formatQuantity(kpis.productosSinStock),
        icon: 'feather icon-x-circle',
        tone: 'stockout',
        tooltip: 'Productos sin disponibilidad actual.'
      },
      {
        id: 'productosSinRotacion',
        label: 'Sin rotacion',
        value: this.formatQuantity(kpis.productosSinRotacion),
        icon: 'feather icon-pause-circle',
        tone: 'stale',
        tooltip: 'Productos sin movimiento comercial reciente.'
      },
      {
        id: 'productosSobreStock',
        label: 'Sobrestock',
        value: this.formatQuantity(kpis.productosSobreStock),
        icon: 'feather icon-layers',
        tone: 'overstock',
        tooltip: 'Productos con inventario superior a la demanda esperada.'
      },
      {
        id: 'compraSugeridaTotal',
        label: 'Compra sugerida',
        value: this.formatCurrency(kpis.compraSugeridaTotal),
        icon: 'feather icon-shopping-cart',
        tone: 'success',
        tooltip: 'Monto sugerido para reposicion segun demanda y riesgo.'
      },
      {
        id: 'capitalComprometido',
        label: 'Capital comprometido',
        value: this.formatCurrency(kpis.capitalComprometido),
        icon: 'feather icon-dollar-sign',
        tone: 'capital',
        tooltip: 'Capital inmovilizado o expuesto por decisiones pendientes.'
      },
      {
        id: 'diasInventarioPromedio',
        label: 'Dias inventario',
        value: this.formatDays(kpis.diasInventarioPromedio),
        icon: 'feather icon-clock',
        tone: 'neutral',
        tooltip: 'Promedio de dias de inventario disponible.'
      }
    ];
  });

  readonly acciones = computed<AccionRecomendadaDto[]>(() => this.dashboard().accionesRecomendadas);
  readonly productosCriticos = computed<ProductoCriticoDto[]>(() => this.dashboard().productosCriticos);
  readonly proveedores = computed(() =>
    [...this.dashboard().proveedores].sort((a, b) => b.capitalEnRiesgo - a.capitalEnRiesgo)
  );
  readonly categorias = computed(() =>
    [...this.dashboard().categorias].sort((a, b) => b.valorInventarioTotal - a.valorInventarioTotal)
  );
  readonly estados = computed<EstadoInventarioDto[]>(() => this.dashboard().estados);
  readonly totalEstados = computed(() => this.estados().reduce((total, estado) => total + estado.cantidadProductos, 0));
  readonly estadoSlices = computed<EstadoChartSlice[]>(() => {
    const total = this.totalEstados();

    return this.estados().map((estado) => ({
      estado: estado.estadoInventario,
      cantidad: estado.cantidadProductos,
      porcentaje: total > 0 ? (estado.cantidadProductos / total) * 100 : 0,
      color: this.estadoColor(estado.estadoInventario)
    }));
  });
  readonly doughnutBackground = computed(() => this.buildDoughnutGradient(this.estadoSlices()));
  readonly maxCapitalProveedor = computed(() => Math.max(...this.proveedores().map((proveedor) => proveedor.capitalEnRiesgo), 0));
  readonly ultimaActualizacion = computed(() => this.formatDateTime(this.dashboard().kpis.fechaUltimaActualizacion));

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.dashboardService
      .obtenerDashboard(this.filtros())
      .pipe(
        catchError(() => {
          this.errorMessage.set('No fue posible cargar el dashboard de inteligencia comercial.');
          return of(EMPTY_DASHBOARD);
        }),
        finalize(() => this.loading.set(false))
      )
      .subscribe((dashboard) => this.dashboard.set(this.normalizeDashboard(dashboard)));
  }

  onTopProductosChange(event: Event): void {
    const value = Number((event.target as HTMLSelectElement).value);

    this.filtros.update((filtros) => ({
      ...filtros,
      topProductosCriticos: value,
      topAcciones: value
    }));
    this.loadDashboard();
  }

  openMotivo(accion: AccionRecomendadaDto): void {
    this.selectedAction.set(accion);
  }

  closeMotivo(): void {
    this.selectedAction.set(null);
  }

  formatCurrency(value: number | null | undefined): string {
    const amount = Number(value ?? 0);
    const abs = Math.abs(amount);
    const units = [
      { limit: 1_000_000_000, suffix: 'B', divisor: 1_000_000_000 },
      { limit: 1_000_000, suffix: 'M', divisor: 1_000_000 },
      { limit: 1_000, suffix: 'K', divisor: 1_000 }
    ];
    const unit = units.find((item) => abs >= item.limit);
    const formatted = unit ? `${(amount / unit.divisor).toFixed(2)} ${unit.suffix}` : amount.toFixed(2);

    return `₡${formatted}`;
  }

  formatQuantity(value: number | null | undefined): string {
    const amount = Number(value ?? 0);
    const abs = Math.abs(amount);

    if (abs >= 1_000_000_000) {
      return `${(amount / 1_000_000_000).toFixed(2)} B`;
    }

    if (abs >= 1_000_000) {
      return `${(amount / 1_000_000).toFixed(2)} M`;
    }

    if (abs >= 1_000) {
      return `${(amount / 1_000).toFixed(1)} K`;
    }

    return new Intl.NumberFormat('es-CR', { maximumFractionDigits: 0 }).format(amount);
  }

  formatDecimal(value: number | null | undefined, digits = 1): string {
    return new Intl.NumberFormat('es-CR', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    }).format(Number(value ?? 0));
  }

  formatDays(value: number | null | undefined): string {
    return `${this.formatDecimal(value, 1)} d`;
  }

  formatPercent(value: number): string {
    return `${this.formatDecimal(value, 1)}%`;
  }

  proveedorBarWidth(proveedor: ProveedorDashboardDto): number {
    const max = this.maxCapitalProveedor();

    if (max <= 0) {
      return 0;
    }

    return Math.max((proveedor.capitalEnRiesgo / max) * 100, 4);
  }

  accionRecomendadaLabel(accion: AccionRecomendadaDto): string {
    if (this.normalizeStatus(accion.estadoInventario) === 'CRITICO') {
      return 'Reponer inventario';
    }

    if (this.normalizeStatus(accion.estadoInventario) === 'SOBRESTOCK') {
      return 'Reducir sobrestock';
    }

    if (this.normalizeStatus(accion.estadoInventario) === 'SIN_ROTACION') {
      return 'Revisar rotacion';
    }

    return 'Evaluar accion';
  }

  estadoBadgeClass(estado: EstadoInventarioDashboard): string {
    const normalized = this.normalizeStatus(estado);

    if (normalized === 'CRITICO' || normalized === 'SIN_STOCK') {
      return 'ci-badge ci-badge--danger-strong';
    }

    if (normalized === 'RIESGO' || normalized === 'SIN_ROTACION' || normalized === 'SOBRESTOCK') {
      return 'ci-badge ci-badge--warning';
    }

    return 'ci-badge ci-badge--success';
  }

  riesgoBadgeClass(riesgo: NivelRiesgoDashboard): string {
    const normalized = String(riesgo || '').toUpperCase();

    if (normalized === 'ALTO') {
      return 'ci-badge ci-badge--danger-strong';
    }

    if (normalized === 'MEDIO') {
      return 'ci-badge ci-badge--warning';
    }

    return 'ci-badge ci-badge--success';
  }

  stockClass(stock: number): string {
    if (stock < 0) {
      return 'ci-value-danger-strong';
    }

    if (stock === 0) {
      return 'ci-value-danger';
    }

    return '';
  }

  inventoryDaysClass(days: number): string {
    return days <= 3 ? 'ci-cell-danger-soft' : '';
  }

  staleDaysClass(days: number): string {
    return days > 30 ? 'ci-cell-warning-soft' : '';
  }

  estadoColor(estado: EstadoInventarioDashboard): string {
    switch (this.normalizeStatus(estado)) {
      case 'CRITICO':
        return '#dc2626';
      case 'RIESGO':
        return '#f97316';
      case 'SIN_STOCK':
        return '#7f1d1d';
      case 'SIN_ROTACION':
        return '#d97706';
      case 'SOBRESTOCK':
        return '#2563eb';
      case 'NORMAL':
        return '#16a34a';
      default:
        return '#64748b';
    }
  }

  private normalizeDashboard(dashboard: DashboardInventarioDto | null | undefined): DashboardInventarioDto {
    if (!dashboard) {
      return EMPTY_DASHBOARD;
    }

    return {
      kpis: { ...EMPTY_KPIS, ...dashboard.kpis },
      accionesRecomendadas: dashboard.accionesRecomendadas ?? [],
      productosCriticos: dashboard.productosCriticos ?? [],
      proveedores: dashboard.proveedores ?? [],
      categorias: dashboard.categorias ?? [],
      estados: dashboard.estados ?? []
    };
  }

  private buildDoughnutGradient(slices: EstadoChartSlice[]): string {
    if (slices.length === 0 || this.totalEstados() === 0) {
      return 'conic-gradient(#e2e8f0 0deg 360deg)';
    }

    let start = 0;
    const stops = slices.map((slice) => {
      const end = start + slice.porcentaje * 3.6;
      const stop = `${slice.color} ${start.toFixed(2)}deg ${end.toFixed(2)}deg`;
      start = end;
      return stop;
    });

    return `conic-gradient(${stops.join(', ')})`;
  }

  private normalizeStatus(status: string): string {
    return String(status || '').trim().toUpperCase();
  }

  private formatDateTime(value: string | null | undefined): string {
    if (!value) {
      return 'Sin actualizar';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic'];
    const day = String(date.getDate()).padStart(2, '0');
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    const hour = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const meridiem = date.getHours() >= 12 ? 'PM' : 'AM';

    return `${day} ${month} ${year} ${hour}:${minutes} ${meridiem}`;
  }
}
