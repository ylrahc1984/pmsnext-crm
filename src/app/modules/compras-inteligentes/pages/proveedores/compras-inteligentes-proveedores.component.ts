import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs/operators';

import { FiltrosProveedoresInteligencia } from 'src/app/modules/inteligencia-comercial/interfaces/filtros-proveedores-inteligencia.interface';
import { KpisProveedoresInteligencia } from 'src/app/modules/inteligencia-comercial/interfaces/kpis-proveedores-inteligencia.interface';
import { ProveedorInteligencia } from 'src/app/modules/inteligencia-comercial/interfaces/proveedor-inteligencia.interface';
import { ProveedoresInteligenciaMetadata } from 'src/app/modules/inteligencia-comercial/interfaces/proveedores-inteligencia-response.interface';
import { InteligenciaComercialService } from 'src/app/modules/inteligencia-comercial/services/inteligencia-comercial.service';
import { OperationalWidgetComponent } from '../../components/operational-widget/operational-widget.component';

type BadgeTone = 'success' | 'warning' | 'danger' | 'danger-strong' | 'muted' | 'info' | 'finance';
type SupplierSegment = 'ESTRATEGICO' | 'PALANCA' | 'CUELLO DE BOTELLA' | 'NO CRITICO';
type KpiCard = {
  label: string;
  value: string;
  note: string;
  icon: string;
  tone: BadgeTone;
  featured?: boolean;
};
type RiskItem = {
  label: string;
  value: number;
  total: number;
  icon: string;
  tone: BadgeTone;
};

const EMPTY_KPIS: KpisProveedoresInteligencia = {
  TotalRojo: 0,
  TotalAmarillo: 0,
  TotalVerde: 0,
  TotalActivos: 0,
  TotalLentos: 0,
  TotalInactivos: 0,
  TotalCriticosDependencia: 0,
  TotalCompraContado: 0,
  CompraTotalAnalizada: 0,
  PromedioDiasCredito: 0,
  PromedioLeadTime: 0,
  PromedioParticipacionProveedor: 0,
  MayorDependenciaProveedor: 0,
  ProveedoresAltaDependencia: 0,
  ProveedoresLeadTimeAlto: 0
};

@Component({
  selector: 'app-compras-inteligentes-proveedores',
  standalone: true,
  imports: [CommonModule, FormsModule, OperationalWidgetComponent],
  templateUrl: './compras-inteligentes-proveedores.component.html',
  styleUrls: ['../compras-inteligentes-page.scss', './compras-inteligentes-proveedores.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ComprasInteligentesProveedoresComponent implements OnInit {
  private readonly inteligenciaService = inject(InteligenciaComercialService);
  private readonly destroyRef = inject(DestroyRef);
  private buscarPendiente = false;

  readonly proveedores = signal<ProveedorInteligencia[]>([]);
  readonly metadata = signal<ProveedoresInteligenciaMetadata | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly busquedaEjecutada = signal(false);

  readonly pageNumber = signal(1);
  readonly pageSize = signal(24);
  readonly codigoAlmacen = signal('PRINCIP');
  readonly diasAnalisis = signal<number | null>(30);
  readonly fechaCorte = signal(this.toInputDate(new Date()));
  readonly soloCriticos = signal(false);
  readonly busquedaProveedor = signal('');
  readonly filtroSemaforo = signal('');
  readonly filtroEstado = signal('');
  readonly debug = signal(false);
  readonly mostrarTecnicos = signal(false);

  readonly semaforoOptions = ['ROJO', 'AMARILLO', 'VERDE'];
  readonly estadoOptions = ['ACTIVO', 'LENTO', 'INACTIVO', 'CRITICO'];

  readonly kpis = computed(() => this.metadata()?.kpIs ?? EMPTY_KPIS);
  readonly totalRegistros = computed(() => this.metadata()?.totalRegistros ?? this.proveedoresFiltrados().length);
  readonly totalPaginas = computed(() => Math.max(1, this.metadata()?.totalPaginas ?? 1));
  readonly filtrosBloqueados = computed(() => this.loading());

  readonly proveedoresFiltrados = computed(() => {
    const term = this.normalizeForCompare(this.busquedaProveedor());
    const semaforo = this.normalizeForCompare(this.filtroSemaforo());
    const estado = this.normalizeForCompare(this.filtroEstado());

    return this.proveedores().filter((proveedor) => {
      const matchesTerm =
        !term ||
        this.normalizeForCompare(proveedor.nomProveedorPrincipal).includes(term) ||
        this.normalizeForCompare(proveedor.codProveedorPrincipal).includes(term);
      const matchesSemaforo = !semaforo || this.normalizeForCompare(proveedor.semaforoProveedor) === semaforo;
      const matchesEstado = !estado || this.normalizeForCompare(proveedor.estadoProveedor) === estado;

      return matchesTerm && matchesSemaforo && matchesEstado;
    });
  });

  readonly headerResumen = computed(() => {
    const kpis = this.kpis();

    return [
      { label: 'Proveedores', value: this.formatNumber(this.totalRegistros()), icon: 'icon-users' },
      { label: 'Criticos', value: this.formatNumber(kpis.TotalRojo), icon: 'icon-alert-triangle' },
      { label: 'Dependencia alta', value: this.formatNumber(kpis.ProveedoresAltaDependencia), icon: 'icon-link' },
      { label: 'Compra total', value: this.formatCurrency(kpis.CompraTotalAnalizada), icon: 'icon-dollar-sign' },
      { label: 'Credito prom.', value: `${this.formatNumber(kpis.PromedioDiasCredito, '1.0-1')}d`, icon: 'icon-credit-card' },
      { label: 'Lead time prom.', value: `${this.formatNumber(kpis.PromedioLeadTime, '1.0-1')}d`, icon: 'icon-truck' }
    ];
  });

  readonly kpiCards = computed<KpiCard[]>(() => {
    const kpis = this.kpis();

    return [
      {
        label: 'Riesgo rojo',
        value: this.formatNumber(kpis.TotalRojo),
        note: `${this.formatNumber(kpis.TotalAmarillo)} preventivos`,
        icon: 'icon-alert-triangle',
        tone: 'danger-strong',
        featured: true
      },
      {
        label: 'Dependencia critica',
        value: this.formatNumber(kpis.TotalCriticosDependencia),
        note: `${this.formatNumber(kpis.ProveedoresAltaDependencia)} alta dependencia`,
        icon: 'icon-link-2',
        tone: 'danger',
        featured: true
      },
      {
        label: 'Mayor dependencia',
        value: `${this.formatNumber(kpis.MayorDependenciaProveedor, '1.0-2')}%`,
        note: `Promedio ${this.formatNumber(kpis.PromedioParticipacionProveedor, '1.0-2')}%`,
        icon: 'icon-pie-chart',
        tone: 'finance',
        featured: true
      },
      {
        label: 'Compra analizada',
        value: this.formatCurrency(kpis.CompraTotalAnalizada),
        note: `${this.formatNumber(kpis.TotalCompraContado)} operan contado`,
        icon: 'icon-bar-chart-2',
        tone: 'info',
        featured: true
      },
      {
        label: 'Activos',
        value: this.formatNumber(kpis.TotalActivos),
        note: `${this.formatNumber(kpis.TotalVerde)} en verde`,
        icon: 'icon-check-circle',
        tone: 'success'
      },
      {
        label: 'Lentos / inactivos',
        value: this.formatNumber(kpis.TotalLentos + kpis.TotalInactivos),
        note: `${this.formatNumber(kpis.TotalInactivos)} inactivos`,
        icon: 'icon-clock',
        tone: 'warning'
      },
      {
        label: 'Lead time alto',
        value: this.formatNumber(kpis.ProveedoresLeadTimeAlto),
        note: `Promedio ${this.formatNumber(kpis.PromedioLeadTime, '1.0-1')} dias`,
        icon: 'icon-truck',
        tone: 'warning'
      },
      {
        label: 'Credito promedio',
        value: `${this.formatNumber(kpis.PromedioDiasCredito, '1.0-1')}d`,
        note: 'Capacidad financiera del grupo',
        icon: 'icon-credit-card',
        tone: 'success'
      }
    ];
  });

  readonly mapaRiesgo = computed<RiskItem[]>(() => {
    const kpis = this.kpis();
    const total = Math.max(1, this.totalRegistros());

    return [
      { label: 'Proveedores criticos', value: kpis.TotalRojo, total, icon: 'icon-alert-triangle', tone: 'danger-strong' },
      { label: 'Dependencia alta', value: kpis.ProveedoresAltaDependencia, total, icon: 'icon-link', tone: 'danger' },
      { label: 'Inactivos', value: kpis.TotalInactivos, total, icon: 'icon-pause-circle', tone: 'muted' },
      { label: 'Compra contado', value: kpis.TotalCompraContado, total, icon: 'icon-dollar-sign', tone: 'finance' },
      { label: 'Lead time alto', value: kpis.ProveedoresLeadTimeAlto, total, icon: 'icon-truck', tone: 'warning' }
    ];
  });

  ngOnInit(): void {
    
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
      .obtenerProveedoresInteligencia(this.buildFiltros())
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
          this.proveedores.set(response.data ?? []);
          this.metadata.set(response.metadata ?? null);
          if (!response.success) {
            this.error.set(response.message || 'La consulta de proveedores no fue exitosa.');
          }
        },
        error: () => {
          this.proveedores.set([]);
          this.metadata.set(null);
          this.error.set('No fue posible cargar la inteligencia de proveedores desde el API.');
        }
      });
  }

  limpiar(): void {
    this.pageNumber.set(1);
    this.pageSize.set(24);
    this.codigoAlmacen.set('PRINCIP');
    this.diasAnalisis.set(30);
    this.fechaCorte.set(this.toInputDate(new Date()));
    this.soloCriticos.set(false);
    this.busquedaProveedor.set('');
    this.filtroSemaforo.set('');
    this.filtroEstado.set('');
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

  getSemaforoClass(value: string | null | undefined): BadgeTone {
    const normalized = this.normalizeForCompare(value);
    if (normalized === 'VERDE') {
      return 'success';
    }
    if (normalized === 'AMARILLO') {
      return 'warning';
    }
    if (normalized === 'ROJO') {
      return 'danger-strong';
    }
    return 'muted';
  }

  getDependenciaClass(value: string | null | undefined): BadgeTone {
    const normalized = this.normalizeForCompare(value);
    if (normalized === 'BAJA') {
      return 'success';
    }
    if (normalized === 'MEDIA') {
      return 'warning';
    }
    if (normalized === 'ALTA') {
      return 'danger';
    }
    if (normalized === 'CRITICA') {
      return 'danger-strong';
    }
    return 'muted';
  }

  getEstadoClass(value: string | null | undefined): BadgeTone {
    const normalized = this.normalizeForCompare(value);
    if (normalized === 'ACTIVO') {
      return 'success';
    }
    if (normalized === 'LENTO') {
      return 'warning';
    }
    if (normalized === 'INACTIVO') {
      return 'muted';
    }
    if (normalized === 'CRITICO') {
      return 'danger-strong';
    }
    return 'muted';
  }

  getDiasSinCompraClass(value: number | null | undefined): BadgeTone {
    const dias = Number(value);
    if (!Number.isFinite(dias)) {
      return 'muted';
    }
    if (dias < 30) {
      return 'success';
    }
    if (dias <= 90) {
      return 'warning';
    }
    if (dias > 120) {
      return 'danger-strong';
    }
    return 'danger';
  }

  getSegmentacionProveedor(proveedor: ProveedorInteligencia): SupplierSegment {
    const dependencia = this.normalizeForCompare(proveedor.nivelDependencia);
    const estado = this.normalizeForCompare(proveedor.estadoProveedor);
    const participacion = Number(proveedor.participacionCompraPorcentaje) || 0;
    const categorias = Number(proveedor.categoriasAtendidas) || 0;
    const productos = Number(proveedor.productosComprados) || 0;
    const ticket = Number(proveedor.ticketPromedioCompra) || 0;

    if ((dependencia === 'ALTA' || dependencia === 'CRITICA') && participacion >= 15) {
      return 'ESTRATEGICO';
    }
    if (dependencia === 'MEDIA' && categorias >= 3) {
      return 'PALANCA';
    }
    if (estado === 'INACTIVO' && productos >= 10) {
      return 'CUELLO DE BOTELLA';
    }
    if (dependencia === 'BAJA' && ticket <= 250) {
      return 'NO CRITICO';
    }
    if (dependencia === 'MEDIA' || categorias >= 3) {
      return 'PALANCA';
    }
    return 'NO CRITICO';
  }

  segmentacionClass(segment: SupplierSegment): BadgeTone {
    const tones: Record<SupplierSegment, BadgeTone> = {
      ESTRATEGICO: 'danger',
      PALANCA: 'info',
      'CUELLO DE BOTELLA': 'warning',
      'NO CRITICO': 'success'
    };

    return tones[segment];
  }

  getParticipacionWidth(value: number | null | undefined): string {
    const numeric = Math.min(100, Math.max(0, Number(value) || 0));
    return `${numeric}%`;
  }

  getRiskWidth(item: RiskItem): string {
    return `${Math.min(100, Math.max(0, (item.value / Math.max(1, item.total)) * 100))}%`;
  }

  semaforoLabel(value: string | null | undefined): string {
    return this.normalizeForCompare(value) || 'SIN DATOS';
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

  hasNumericValue(value: number | null | undefined): boolean {
    return Number.isFinite(Number(value));
  }

  trackByProveedor(_index: number, proveedor: ProveedorInteligencia): string {
    return proveedor.codProveedorPrincipal;
  }

  private buildFiltros(): FiltrosProveedoresInteligencia {
    return {
      pageNumber: this.toPositiveNumber(this.pageNumber(), 1),
      pageSize: this.toPositiveNumber(this.pageSize(), 24),
      codigoAlmacen: this.codigoAlmacen(),
      diasAnalisis: this.toOptionalNumber(this.diasAnalisis()),
      fechaCorte: this.toApiDate(this.fechaCorte()),
      soloCriticos: this.soloCriticos(),
      filtroSemaforo: this.filtroSemaforo(),
      filtroEstado: this.filtroEstado(),
      debug: this.debug()
    };
  }

  private toOptionalNumber(value: number | string | null): number | undefined {
    if (value === null || value === '') {
      return undefined;
    }

    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : undefined;
  }

  private toPositiveNumber(value: number | string | null, fallback: number): number {
    const numeric = this.toOptionalNumber(value);
    return numeric && numeric > 0 ? numeric : fallback;
  }

  private toInputDate(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private toApiDate(value: string): string | undefined {
    if (!value) {
      return undefined;
    }

    const [year, month, day] = value.split('-');
    if (!year || !month || !day) {
      return value;
    }

    return `${day}/${month}/${year}`;
  }

  private normalizeForCompare(value: string | null | undefined): string {
    return (value ?? '')
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase();
  }
}
