import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize, map } from 'rxjs/operators';

import { ProveedorService, ProveedorUI } from 'src/app/demo/compras/proveedores/proveedor.service';
import { FiltrosRecomendacionesCompra } from 'src/app/modules/inteligencia-comercial/interfaces/filtros-recomendaciones-compra.interface';
import { KpisRecomendacionesCompra } from 'src/app/modules/inteligencia-comercial/interfaces/kpis-recomendaciones-compra.interface';
import { RecomendacionCompra } from 'src/app/modules/inteligencia-comercial/interfaces/recomendacion-compra.interface';
import { RecomendacionesCompraMetadata } from 'src/app/modules/inteligencia-comercial/interfaces/recomendaciones-compra-response.interface';
import { InteligenciaComercialService } from 'src/app/modules/inteligencia-comercial/services/inteligencia-comercial.service';
import { OperationalWidgetComponent } from '../../components/operational-widget/operational-widget.component';

type Tone = 'success' | 'warning' | 'danger' | 'danger-strong' | 'muted' | 'info' | 'finance';
type KpiPill = { label: string; value: string; note: string; icon: string; tone: Tone; featured?: boolean };
type RadarItem = { label: string; value: number; total: number; icon: string; tone: Tone };
type SupplierGroup = {
  proveedorCodigo: string;
  proveedorNombre: string;
  totalProductos: number;
  totalInversion: number;
  urgentes: number;
  recomendaciones: RecomendacionCompra[];
};
type StrategicInsight = { text: string; tone: Tone; icon: string };
type OperationalRow =
  | { type: 'provider'; key: string; group: SupplierGroup }
  | { type: 'recommendation'; key: string; item: RecomendacionCompra };

const EMPTY_KPIS: KpisRecomendacionesCompra = {
  TotalUrgentes: 0,
  TotalAltas: 0,
  TotalMedias: 0,
  TotalBajas: 0,
  InversionTotalEstimada: 0,
  UnidadesTotalesRecomendadas: 0,
  InversionCritica: 0,
  ProductosAgotanProximos7Dias: 0,
  ProductosAgotadosAhora: 0
};

@Component({
  selector: 'app-compras-inteligentes-recomendaciones',
  standalone: true,
  imports: [CommonModule, FormsModule, ScrollingModule, OperationalWidgetComponent],
  templateUrl: './compras-inteligentes-recomendaciones.component.html',
  styleUrls: ['../compras-inteligentes-page.scss', './compras-inteligentes-recomendaciones.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ComprasInteligentesRecomendacionesComponent implements OnInit {
  private readonly inteligenciaService = inject(InteligenciaComercialService);
  private readonly proveedorService = inject(ProveedorService);
  private readonly destroyRef = inject(DestroyRef);
  private buscarPendiente = false;
  private proveedorSearchTimer: ReturnType<typeof setTimeout> | null = null;

  readonly recomendaciones = signal<RecomendacionCompra[]>([]);
  readonly metadata = signal<RecomendacionesCompraMetadata | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly busquedaEjecutada = signal(false);

  readonly pageNumber = signal(1);
  readonly pageSize = signal(24);
  readonly codigoAlmacen = signal('PRINCIP');
  readonly proveedor = signal('');
  readonly proveedorSearch = signal('');
  readonly incluirReposicionPreventiva = signal(false);
  readonly busquedaProducto = signal('');
  readonly filtroPrioridad = signal('');
  readonly categoria = signal('');
  readonly linea = signal('');
  readonly debug = signal(false);
  readonly mostrarTecnicos = signal(false);
  readonly proveedores = signal<ProveedorUI[]>([]);
  readonly proveedoresLoading = signal(false);

  readonly prioridadOptions = ['URGENTE', 'ALTA', 'MEDIA', 'BAJA'];

  readonly kpis = computed(() => this.metadata()?.kpIs ?? EMPTY_KPIS);
  readonly totalRegistros = computed(() => this.metadata()?.totalRegistros ?? this.recomendacionesFiltradas().length);
  readonly totalPaginas = computed(() => Math.max(1, this.metadata()?.totalPaginas ?? 1));
  readonly filtrosBloqueados = computed(() => this.loading() || this.proveedoresLoading());

  readonly recomendacionesFiltradas = computed(() => {
    const term = this.normalizeForCompare(this.busquedaProducto());
    const prioridad = this.normalizeForCompare(this.filtroPrioridad());
    const categoria = this.normalizeForCompare(this.categoria());
    const linea = this.normalizeForCompare(this.linea());

    return this.recomendaciones().filter((item) => {
      const matchesTerm =
        !term ||
        this.normalizeForCompare(item.nomProducto).includes(term) ||
        this.normalizeForCompare(item.codProducto).includes(term);
      const matchesPrioridad = !prioridad || this.normalizeForCompare(item.prioridad) === prioridad;
      const matchesCategoria = !categoria || this.normalizeForCompare(item.categoriaProducto).includes(categoria);
      const matchesLinea = !linea || this.normalizeForCompare(item.lineaProducto).includes(linea);

      return matchesTerm && matchesPrioridad && matchesCategoria && matchesLinea;
    });
  });

  readonly kpiBar = computed<KpiPill[]>(() => {
    const kpis = this.kpis();

    return [
      {
        label: 'Agotados ahora',
        value: this.formatNumber(kpis.ProductosAgotadosAhora),
        note: 'Ruptura inmediata',
        icon: 'icon-alert-triangle',
        tone: 'danger-strong',
        featured: true
      },
      {
        label: 'Urgentes',
        value: this.formatNumber(kpis.TotalUrgentes),
        note: 'Prioridad maxima',
        icon: 'icon-zap',
        tone: 'danger',
        featured: true
      },
      {
        label: 'Inversion critica',
        value: this.formatCurrency(kpis.InversionCritica),
        note: 'Capital inmediato',
        icon: 'icon-dollar-sign',
        tone: 'danger',
        featured: true
      },
      {
        label: 'Agotan 7d',
        value: this.formatNumber(kpis.ProductosAgotanProximos7Dias),
        note: 'Riesgo semanal',
        icon: 'icon-clock',
        tone: 'warning'
      },
      {
        label: 'Inversion total',
        value: this.formatCurrency(kpis.InversionTotalEstimada),
        note: `${this.formatNumber(kpis.UnidadesTotalesRecomendadas)} unidades`,
        icon: 'icon-bar-chart-2',
        tone: 'finance'
      },
      {
        label: 'Altas',
        value: this.formatNumber(kpis.TotalAltas),
        note: 'Riesgo alto',
        icon: 'icon-trending-up',
        tone: 'warning'
      },
      {
        label: 'Medias',
        value: this.formatNumber(kpis.TotalMedias),
        note: 'Preventivas',
        icon: 'icon-activity',
        tone: 'info'
      },
      {
        label: 'Bajas',
        value: this.formatNumber(kpis.TotalBajas),
        note: 'Planificables',
        icon: 'icon-check-circle',
        tone: 'success'
      }
    ];
  });

  readonly radarOperativo = computed<RadarItem[]>(() => {
    const kpis = this.kpis();
    const total = Math.max(
      1,
      kpis.ProductosAgotadosAhora,
      kpis.ProductosAgotanProximos7Dias,
      kpis.TotalUrgentes,
      kpis.TotalAltas,
      kpis.TotalMedias
    );

    return [
      { label: 'Agotados ahora', value: kpis.ProductosAgotadosAhora, total, icon: 'icon-alert-triangle', tone: 'danger-strong' },
      { label: 'Agotan proximos 7d', value: kpis.ProductosAgotanProximos7Dias, total, icon: 'icon-clock', tone: 'danger' },
      { label: 'Urgencias criticas', value: kpis.TotalUrgentes, total, icon: 'icon-zap', tone: 'danger' },
      { label: 'Prioridad alta', value: kpis.TotalAltas, total, icon: 'icon-trending-up', tone: 'warning' },
      { label: 'Reposicion preventiva', value: kpis.TotalMedias + kpis.TotalBajas, total, icon: 'icon-shield', tone: 'info' }
    ];
  });

  readonly gruposProveedor = computed<SupplierGroup[]>(() => {
    const groups = new Map<string, SupplierGroup>();

    for (const recomendacion of this.recomendacionesFiltradas()) {
      const proveedorCodigo = recomendacion.codProveedorPrincipal || 'SIN-PROVEEDOR';
      const proveedorNombre = recomendacion.nomProveedorPrincipal || 'Proveedor no asignado';
      const key = `${proveedorCodigo}-${proveedorNombre}`;
      const current =
        groups.get(key) ??
        ({
          proveedorCodigo,
          proveedorNombre,
          totalProductos: 0,
          totalInversion: 0,
          urgentes: 0,
          recomendaciones: []
        } satisfies SupplierGroup);

      current.totalProductos += 1;
      current.totalInversion += Number(recomendacion.costoEstimadoCompra) || 0;
      current.urgentes += this.normalizeForCompare(recomendacion.prioridad) === 'URGENTE' ? 1 : 0;
      current.recomendaciones.push(recomendacion);
      groups.set(key, current);
    }

    return [...groups.values()].sort((a, b) => b.urgentes - a.urgentes || b.totalInversion - a.totalInversion);
  });

  readonly operationalRows = computed<OperationalRow[]>(() => {
    const rows: OperationalRow[] = [];

    for (const group of this.gruposProveedor()) {
      rows.push({
        type: 'provider',
        key: `provider-${group.proveedorCodigo}-${group.proveedorNombre}`,
        group
      });

      for (const item of group.recomendaciones) {
        rows.push({
          type: 'recommendation',
          key: `recommendation-${item.codAlmacen}-${item.codProducto}-${group.proveedorCodigo}`,
          item
        });
      }
    }

    return rows;
  });

  readonly insightsEstrategicos = computed<StrategicInsight[]>(() => {
    const kpis = this.kpis();
    const topProveedor = this.gruposProveedor()[0];

    return [
      {
        text: `${this.formatNumber(kpis.ProductosAgotadosAhora)} productos ya estan agotados`,
        tone: 'danger-strong',
        icon: 'icon-alert-triangle'
      },
      {
        text: `${this.formatCurrency(kpis.InversionCritica)} requieren inversion inmediata`,
        tone: 'danger',
        icon: 'icon-dollar-sign'
      },
      {
        text: `${this.formatNumber(kpis.ProductosAgotanProximos7Dias)} productos podrian agotarse esta semana`,
        tone: 'warning',
        icon: 'icon-clock'
      },
      {
        text: topProveedor
          ? `${topProveedor.proveedorNombre} concentra ${this.formatNumber(topProveedor.totalProductos)} recomendaciones`
          : 'Sin proveedor dominante en la consulta actual',
        tone: 'info',
        icon: 'icon-briefcase'
      }
    ];
  });

  ngOnInit(): void {
   // this.buscar();
  }

  aplicarFiltros(): void {
    if (this.filtrosBloqueados()) {
      return;
    }

    this.pageNumber.set(1);
    this.buscar();
  }

  buscar(): void {
    if (this.loading()) {
      this.buscarPendiente = true;
      return;
    }

    this.buscarPendiente = false;
    this.busquedaEjecutada.set(true);
    this.loading.set(true);
    this.error.set(null);

    this.inteligenciaService
      .obtenerRecomendacionesCompra(this.buildFiltros())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.loading.set(false);
          if (this.buscarPendiente) {
            this.buscar();
          }
        })
      )
      .subscribe({
        next: (response) => {
          this.recomendaciones.set(response.data ?? []);
          this.metadata.set(response.metadata ?? null);
          if (!response.success) {
            this.error.set(response.message || 'La consulta de recomendaciones no fue exitosa.');
          }
        },
        error: () => {
          this.recomendaciones.set([]);
          this.metadata.set(null);
          this.error.set('No fue posible cargar las recomendaciones de compra desde el API.');
        }
      });
  }

  limpiar(): void {
    this.pageNumber.set(1);
    this.pageSize.set(24);
    this.codigoAlmacen.set('PRINCIP');
    this.proveedor.set('');
    this.proveedorSearch.set('');
    this.proveedores.set([]);
    this.incluirReposicionPreventiva.set(false);
    this.busquedaProducto.set('');
    this.filtroPrioridad.set('');
    this.categoria.set('');
    this.linea.set('');
    this.debug.set(false);
    this.buscar();
  }

  cambiarPagina(delta: number): void {
    const nextPage = Math.min(this.totalPaginas(), Math.max(1, this.pageNumber() + delta));
    if (nextPage === this.pageNumber()) {
      return;
    }

    this.pageNumber.set(nextPage);
    this.buscar();
  }

  alternarConfiguracionTecnica(): void {
    this.mostrarTecnicos.update((value) => !value);
  }

  buscarProveedores(term: string): void {
    this.proveedorSearch.set(term);
    this.proveedor.set('');

    if (this.proveedorSearchTimer) {
      clearTimeout(this.proveedorSearchTimer);
    }

    const normalized = term.trim();
    if (normalized.length < 2) {
      this.proveedores.set([]);
      this.proveedoresLoading.set(false);
      return;
    }

    this.proveedorSearchTimer = setTimeout(() => {
      this.proveedoresLoading.set(true);
      this.buscarProveedoresPorTermino(normalized)
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          finalize(() => this.proveedoresLoading.set(false))
        )
        .subscribe({
          next: (response) => this.proveedores.set(response.data ?? []),
          error: () => this.proveedores.set([])
        });
    }, 250);
  }

  seleccionarProveedor(proveedor: ProveedorUI): void {
    const codigo = this.normalizeText(proveedor.codigo);

    this.proveedor.set(codigo);
    this.proveedorSearch.set(`${codigo} - ${proveedor.descripcion}`);
    this.proveedores.set([]);
    this.pageNumber.set(1);
  }

  getPrioridadClass(value: string | null | undefined): Tone {
    const normalized = this.normalizeForCompare(value);
    if (normalized === 'URGENTE') {
      return 'danger-strong';
    }
    if (normalized === 'ALTA') {
      return 'danger';
    }
    if (normalized === 'MEDIA') {
      return 'warning';
    }
    if (normalized === 'BAJA') {
      return 'success';
    }
    return 'muted';
  }

  getSaludInventarioClass(value: string | null | undefined): Tone {
    const normalized = this.normalizeForCompare(value);
    if (normalized.includes('SALUDABLE')) {
      return 'success';
    }
    if (normalized.includes('RIESGO')) {
      return 'warning';
    }
    if (normalized.includes('CRITICO') || normalized.includes('AGOTADO')) {
      return 'danger-strong';
    }
    if (normalized.includes('INMOVIL') || normalized.includes('SIN CREDITO')) {
      return 'muted';
    }
    return 'muted';
  }

  getRotacionClass(value: string | null | undefined): Tone {
    const normalized = this.normalizeForCompare(value);
    if (normalized.includes('AGOTADO')) {
      return 'danger-strong';
    }
    if (normalized.includes('LENTA') || normalized.includes('SOBRE STOCK')) {
      return 'warning';
    }
    if (normalized.includes('RAPIDA')) {
      return 'info';
    }
    if (normalized.includes('NORMAL')) {
      return 'success';
    }
    return 'muted';
  }

  getDiasAgotamientoClass(value: number | null | undefined): Tone {
    const dias = Number(value);
    if (!Number.isFinite(dias) || dias <= 0) {
      return 'danger-strong';
    }
    if (dias <= 7) {
      return 'danger';
    }
    if (dias <= 14) {
      return 'warning';
    }
    return 'success';
  }

  getDiasCriticosClass(value: number | null | undefined): Tone {
    return this.getDiasAgotamientoClass(value);
  }

  getCoberturaColor(item: RecomendacionCompra): Tone {
    const stock = Number(item.stockActual) || 0;
    const minimo = Number(item.stockMinimo) || 0;
    const maximo = Math.max(minimo, Number(item.stockMaximo) || 0);

    if (stock <= 0 || stock < minimo) {
      return 'danger-strong';
    }
    if (maximo > 0 && stock <= minimo * 1.2) {
      return 'warning';
    }
    return 'success';
  }

  getInvestmentSeverity(value: number | null | undefined): Tone {
    const amount = Number(value) || 0;
    const critical = Number(this.kpis().InversionCritica) || 0;

    if (critical > 0 && amount >= critical * 0.2) {
      return 'danger';
    }
    if (amount >= 100000) {
      return 'warning';
    }
    return 'finance';
  }

  getInsightSeverity(item: RecomendacionCompra): Tone {
    if (Number(item.diasHastaAgotamiento) <= 0 || this.normalizeForCompare(item.prioridad) === 'URGENTE') {
      return 'danger-strong';
    }
    return this.getPrioridadClass(item.prioridad);
  }

  getStatusSignalLabel(item: RecomendacionCompra): string {
    const dias = Number(item.diasHastaAgotamiento);
    if (!Number.isFinite(dias) || dias <= 0) {
      return 'CRITICO';
    }
    if (dias <= 7) {
      return `${this.formatNumber(dias)}d`;
    }
    if (dias <= 14) {
      return 'PREVENTIVO';
    }
    return 'OK';
  }

  getStatusDetailLabel(item: RecomendacionCompra): string {
    const dias = Number(item.diasHastaAgotamiento);
    if (Number.isFinite(dias) && dias > 7 && dias <= 14) {
      return `${this.formatNumber(dias)}d`;
    }
    if (Number.isFinite(dias) && dias > 14) {
      return `${this.formatNumber(dias)}d`;
    }
    return '';
  }

  getOperacionResumen(item: RecomendacionCompra): string {
    return [
      `Lead ${this.formatNumber(item.leadTimeDias)}d`,
      `Consumo ${this.formatNumber(item.consumoPromedioDiario, '1.0-2')}/d`,
      `${this.formatNumber(item.diasSinCompra)}d sin compra`
    ].join(' · ');
  }

  getOperationalInsight(item: RecomendacionCompra): string | null {
    const leadTime = Number(item.leadTimeDias) || 0;
    const diasSinCompra = Number(item.diasSinCompra) || 0;
    const diasSinVenta = Number(item.diasSinVenta) || 0;
    const amount = Number(item.costoEstimadoCompra) || 0;

    if (leadTime >= 15) {
      return `Lead time elevado: ${this.formatNumber(leadTime)} dias`;
    }
    if (diasSinCompra >= 90) {
      return `${this.formatNumber(diasSinCompra)} dias sin compra; revisar abastecimiento`;
    }
    if (diasSinVenta >= 90) {
      return `${this.formatNumber(diasSinVenta)} dias sin venta; validar reposicion`;
    }
    if (this.getInvestmentSeverity(amount) === 'danger') {
      return `Inversion alta dentro de la urgencia: ${this.formatCurrency(amount)}`;
    }

    const insight = this.normalizeText(item.motivoCompra);
    const normalized = this.normalizeForCompare(insight);
    if (
      insight &&
      !normalized.includes('PRODUCTO AGOTADO') &&
      !normalized.includes('REPOSICION INMEDIATA') &&
      !normalized.includes('REPOSICION REQUERIDA')
    ) {
      return insight;
    }

    return null;
  }

  getCoberturaWidth(item: RecomendacionCompra): string {
    const max = Math.max(1, Number(item.stockMaximo) || 0, Number(item.stockMinimo) || 0);
    const current = Math.min(max, Math.max(0, Number(item.stockActual) || 0));
    return `${(current / max) * 100}%`;
  }

  getStockMinimoMarker(item: RecomendacionCompra): string {
    const max = Math.max(1, Number(item.stockMaximo) || 0, Number(item.stockMinimo) || 0);
    const min = Math.min(max, Math.max(0, Number(item.stockMinimo) || 0));
    return `${(min / max) * 100}%`;
  }

  getRadarWidth(item: RadarItem): string {
    return `${Math.min(100, Math.max(0, (item.value / Math.max(1, item.total)) * 100))}%`;
  }

  diasAgotamientoLabel(item: RecomendacionCompra): string {
    const dias = Number(item.diasHastaAgotamiento);
    if (!Number.isFinite(dias) || dias <= 0) {
      return 'AGOTADO';
    }
    return `${this.formatNumber(dias)} dias`;
  }

  formatCurrency(value: number | null | undefined): string {
    return new Intl.NumberFormat('es-CR', {
      style: 'currency',
      currency: 'CRC',
      maximumFractionDigits: 0
    }).format(Number(value) || 0);
  }

  formatNumber(value: number | null | undefined, digits = '1.0-0'): string {
    const numeric = Number(value) || 0;
    const [integerPart, fractionPart = '0-0'] = digits.split('.');
    const [, minIntegerRaw = '1'] = integerPart.match(/(\d+)/) ?? [];
    const [minFractionRaw = '0', maxFractionRaw = '0'] = fractionPart.split('-');

    return new Intl.NumberFormat('es-CR', {
      minimumIntegerDigits: Number(minIntegerRaw),
      minimumFractionDigits: Number(minFractionRaw),
      maximumFractionDigits: Number(maxFractionRaw)
    }).format(numeric);
  }

  trackByRecomendacion(_index: number, item: RecomendacionCompra): string {
    return `${item.codAlmacen}-${item.codProducto}`;
  }

  trackByProveedor(_index: number, group: SupplierGroup): string {
    return `${group.proveedorCodigo}-${group.proveedorNombre}`;
  }

  trackByOperationalRow(_index: number, row: OperationalRow): string {
    return row.key;
  }

  groupByProveedor(): SupplierGroup[] {
    return this.gruposProveedor();
  }

  private buildFiltros(): FiltrosRecomendacionesCompra {
    return {
      pageNumber: this.toPositiveNumber(this.pageNumber(), 1),
      pageSize: this.toPositiveNumber(this.pageSize(), 24),
      codigoAlmacen: this.codigoAlmacen(),
      proveedor: this.resolveProveedorCodigo(),
      codigoProducto: this.busquedaProducto(),
      filtroPrioridad: this.filtroPrioridad(),
      categoria: this.categoria(),
      linea: this.linea(),
      incluirReposicionPreventiva: this.incluirReposicionPreventiva(),
      debug: this.debug()
    };
  }

  private toPositiveNumber(value: number | string | null, fallback: number): number {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback;
  }

  private buscarProveedoresPorTermino(term: string) {
    const fallback = { data: [], totalRegistros: 0, paginaActual: 1, pageSize: 10, totalPages: 1 };

    if (!this.isLikelyProveedorCodigo(term)) {
      return this.proveedorService.getProveedores(1, 10, undefined, term);
    }

    return forkJoin([
      this.proveedorService.getProveedores(1, 10, term, undefined).pipe(catchError(() => of(fallback))),
      this.proveedorService.getProveedores(1, 10, undefined, term).pipe(catchError(() => of(fallback)))
    ]).pipe(
      map(([porCodigo, porDescripcion]) => {
        const proveedores = [...(porCodigo.data ?? []), ...(porDescripcion.data ?? [])];
        const data = proveedores.filter((item, index, items) => items.findIndex((current) => current.codigo === item.codigo) === index);

        return {
          ...porDescripcion,
          data,
          totalRegistros: data.length
        };
      })
    );
  }

  private resolveProveedorCodigo(): string {
    const selected = this.normalizeText(this.proveedor());
    if (selected) {
      return selected;
    }

    const searchValue = this.normalizeText(this.proveedorSearch());
    const codigoFromDisplay = searchValue.match(/^([^-\/\s]+)\s*(?:-|\/)/)?.[1];

    return this.normalizeText(codigoFromDisplay || searchValue);
  }

  private isLikelyProveedorCodigo(value: string): boolean {
    const normalized = this.normalizeText(value);
    return normalized.length > 0 && normalized.length <= 20 && /[0-9]/.test(normalized) && /^[a-zA-Z0-9._-]+$/.test(normalized);
  }

  private normalizeForCompare(value: string | null | undefined): string {
    return this.normalizeText(value)
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase();
  }

  private normalizeText(value: string | null | undefined): string {
    return (value ?? '').trim();
  }
}
