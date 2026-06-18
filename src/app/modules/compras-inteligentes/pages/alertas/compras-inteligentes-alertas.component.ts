import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize, map } from 'rxjs/operators';

import { CategoriaProductoService } from 'src/app/demo/compras/categoria-producto/categoria-producto.service';
import { CategoriaProducto } from 'src/app/demo/compras/categoria-producto/interfaces/CategoriaProducto.interface';
import { LineaProducto } from 'src/app/demo/compras/linea-producto/interfaces/LineaProducto.interface';
import { LineaProductoService } from 'src/app/demo/compras/linea-producto/linea-producto.service';
import { ProveedorService, ProveedorUI } from 'src/app/demo/compras/proveedores/proveedor.service';
import {
  ComprasInteligentesAlerta,
  ComprasInteligentesAlertasFiltros,
  ComprasInteligentesAlertasMetadata
} from '../../interfaces/compras-inteligentes-alertas.interface';
import { ComprasInteligentesAlertasService } from '../../services/compras-inteligentes-alertas.service';
import { InventoryAlertFeedComponent } from '../../components/inventory-alert-feed/inventory-alert-feed.component';
import { OperationalWidgetComponent } from '../../components/operational-widget/operational-widget.component';

@Component({
  selector: 'app-compras-inteligentes-alertas',
  standalone: true,
  imports: [CommonModule, FormsModule, OperationalWidgetComponent, InventoryAlertFeedComponent],
  templateUrl: './compras-inteligentes-alertas.component.html',
  styleUrls: ['../compras-inteligentes-page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ComprasInteligentesAlertasComponent implements OnInit {
  private readonly alertasService = inject(ComprasInteligentesAlertasService);
  private readonly lineaProductoService = inject(LineaProductoService);
  private readonly categoriaProductoService = inject(CategoriaProductoService);
  private readonly proveedorService = inject(ProveedorService);
  private readonly destroyRef = inject(DestroyRef);
  private proveedorSearchTimer: ReturnType<typeof setTimeout> | null = null;
  private buscarPendiente = false;

  readonly alertas = signal<ComprasInteligentesAlerta[]>([]);
  readonly metadata = signal<ComprasInteligentesAlertasMetadata | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly busquedaEjecutada = signal(false);

  readonly pageNumber = signal(1);
  readonly pageSize = signal(50);
  readonly severidad = signal('');
  readonly codigoProducto = signal('');
  readonly codigoAlmacen = signal('PRINCIP');
  readonly categoria = signal('');
  readonly linea = signal('');
  readonly lineaCodigo = signal('');
  readonly proveedor = signal('');
  readonly diasAnalisis = signal<number | null>(30);
  readonly diasSinVenta = signal<number | null>(60);
  readonly diasSobreStock = signal<number | null>(90);
  readonly diasCritico = signal<number | null>(5);
  readonly margenBajo = signal<number | null>(10);
  readonly capitalAlto = signal<number | null>(500000);
  readonly filtroPrioridad = signal('');
  readonly filtroTipoAlerta = signal('');
  readonly filtroNivelImpacto = signal('');
  readonly ordenarPor = signal('scorePrioridad');
  readonly registrarLog = signal(false);
  readonly debug = signal(false);

  readonly proveedorSearch = signal('');
  readonly lineas = signal<LineaProducto[]>([]);
  readonly categorias = signal<CategoriaProducto[]>([]);
  readonly proveedores = signal<ProveedorUI[]>([]);
  readonly lineasLoading = signal(false);
  readonly categoriasLoading = signal(false);
  readonly proveedoresLoading = signal(false);
  readonly mostrarAvanzados = signal(false);
  readonly mostrarTecnicos = signal(false);

  readonly prioridadOptions = ['CRITICA', 'ALTA', 'MEDIA', 'BAJA'];
  readonly tooltip = {
    prioridad: 'Filtra alertas por urgencia de intervencion calculada: critica, alta, media o baja.',
    impacto: 'Filtra localmente las alertas por impacto principal: operacional, financiero, comercial o mixto.',
    tipo: 'Filtra por tipo especifico de alerta: minimo, maximo, baja rotacion, permanencia, margen, capital u otros analiticos.',
    producto: 'Filtra por codigo especifico de producto.',
    proveedor: 'Filtra por codigo o nombre del proveedor principal del producto.',
    linea: 'Filtra por linea de producto y habilita la seleccion de categorias relacionadas.',
    categoria: 'Filtra por categoria de producto dentro de la linea seleccionada.',
    severidad: 'Parametro legacy de prioridad. Se conserva por compatibilidad, pero el filtro recomendado es Prioridad.',
    diasAnalisis:
      'Dias historicos usados para el analisis. Si aumenta: mas contexto historico y respuesta menos reactiva. Si disminuye: mas enfoque en comportamiento reciente.',
    diasSinVenta:
      'Dias sin venta para marcar baja rotacion, exceso de permanencia o producto sin movimiento. Si aumenta: menos alertas. Si disminuye: mas alertas.',
    diasSobreStock:
      'Dias de cobertura para considerar sobrestock. Si aumenta: menos alertas de sobrestock. Si disminuye: mas alertas de sobrestock.',
    diasCritico:
      'Cobertura en dias para riesgo de ruptura. Si aumenta: mas productos entran en riesgo ruptura. Si disminuye: solo casos mas criticos.',
    margenBajo:
      'Margen minimo objetivo (%) para alerta financiera. Si aumenta: mas productos pueden quedar como margen bajo. Si disminuye: menos productos quedan en alerta.',
    capitalAlto:
      'Monto desde el cual el inventario se considera capital alto. Si aumenta: menos productos con impacto financiero alto. Si disminuye: mas productos marcados.',
    pagina: 'Numero de pagina solicitada al API.',
    registros: 'Cantidad de registros solicitados por pagina.',
    registrarLog: 'Solicita al backend registrar la ejecucion de la consulta en logs.',
    debug: 'Solicita informacion de depuracion del backend cuando el API lo soporta.'
  } as const;
  readonly prioridadDescriptions: Record<string, { representa: string; accion: string }> = {
    CRITICA: {
      representa: 'Riesgo extremo con impacto inmediato en operacion, venta o capital inmovilizado.',
      accion: 'Atender de inmediato: resolver quiebre, exceso o bloqueo antes de continuar la operacion normal.'
    },
    ALTA: {
      representa: 'Riesgo inmediato para operacion o negocio.',
      accion: 'Atender hoy: reabastecer, redistribuir o activar plan comercial inmediato.'
    },
    MEDIA: {
      representa: 'Riesgo moderado con impacto proximo si no se corrige.',
      accion: 'Revisar en el corto plazo: ajustar compras, transferencias o promociones.'
    },
    BAJA: {
      representa: 'Riesgo controlado o de seguimiento preventivo.',
      accion: 'Monitorear y corregir en ciclo normal de planificacion.'
    }
  };
  readonly impactoOptions = ['OPERACIONAL', 'FINANCIERO', 'COMERCIAL', 'MIXTO'];
  readonly ordenOptions = [
    { value: 'scorePrioridad', label: 'Score prioridad' },
    { value: 'valorInventarioEstimado', label: 'Capital riesgo' },
    { value: 'ventaNeta', label: 'Venta neta' },
    { value: 'diasInventario', label: 'Dias inventario' },
    { value: 'margenPorcentaje', label: 'Margen' }
  ];
  readonly tipoAlertaOptions = [
    'INVENTARIO_MINIMO',
    'INVENTARIO_MAXIMO',
    'BAJA_ROTACION',
    'EXCESO_PERMANENCIA',
    'PRODUCTO_AGOTADO',
    'RIESGO_RUPTURA_STOCK',
    'SOBRE_STOCK_ANALITICO',
    'PRODUCTO_SIN_MOVIMIENTO',
    'MARGEN_BAJO',
    'MARGEN_NEGATIVO',
    'ALTO_CAPITAL_INMOVILIZADO'
  ];

  readonly kpis = computed(() => this.metadata()?.kpIs ?? null);
  readonly kpiResumen = computed(() => {
    const kpis = this.kpis();

    return {
      alertasCriticas: this.kpiNumber(kpis, 'TotalAlertasCriticas'),
      alertasAltas: this.kpiNumber(kpis, 'TotalAlertasAltas'),
      alertasMedias: this.kpiNumber(kpis, 'TotalAlertasMedias'),
      alertasBajas: this.kpiNumber(kpis, 'TotalAlertasBajas'),
      tiposDiferentesAlerta: this.kpiNumber(kpis, 'TiposDiferentesAlerta'),
      tiposAlertaBase: this.kpiNumber(kpis, 'TiposAlertaBase'),
      tiposAlertaAnalitica: this.kpiNumber(kpis, 'TiposAlertaAnalitica'),
      capitalRiesgo: this.kpiNumber(kpis, 'CapitalTotalEnRiesgo'),
      scorePromedio: this.kpiNumber(kpis, 'ScorePromedio'),
      riesgoOperacional: this.kpiNumber(kpis, 'TotalAlertasInventario'),
      riesgoFinanciero: this.kpiNumber(kpis, 'TotalAlertasFinancieras'),
      riesgoComercial: this.kpiNumber(kpis, 'TotalAlertasComerciales'),
      alertasInventarioMinimo: this.kpiNumber(kpis, 'AlertasInventarioMinimo'),
      sobreStock: this.kpiNumber(kpis, 'AlertasInventarioMaximo'),
      alertasBajaRotacion: this.kpiNumber(kpis, 'AlertasBajaRotacion'),
      alertasExcesoPermanencia: this.kpiNumber(kpis, 'AlertasExcesoPermanencia'),
      productosAgotados: this.kpiNumber(kpis, 'ProductosAgotados'),
      riesgoRuptura: this.kpiNumber(kpis, 'RiesgoRuptura'),
      sobreStockAnalitico: this.kpiNumber(kpis, 'SobreStockAnalitico'),
      margenesNegativos: this.kpiNumber(kpis, 'MargenesNegativos'),
      altoCapitalInmovilizado: this.kpiNumber(kpis, 'AltoCapitalInmovilizado')
    };
  });
  readonly periodoAnalisis = computed(() => {
    const kpis = this.kpis();
    const diasAnalisis = this.kpiNumber(kpis, 'DiasAnalisis');
    const fechaDesde = this.kpiString(kpis, 'FechaDesdeAnalisis');
    const fechaHasta = this.kpiString(kpis, 'FechaHastaAnalisis');

    return {
      diasAnalisis,
      fechaDesde,
      fechaHasta,
      rango: this.formatDateRange(fechaDesde, fechaHasta)
    };
  });
  readonly totalRegistros = computed(() => this.metadata()?.totalRegistros ?? this.alertas().length);
  readonly totalPaginas = computed(() => Math.max(1, this.metadata()?.totalPaginas ?? 1));
  readonly filtrosBloqueados = computed(() => this.loading() || this.proveedoresLoading());
  readonly alertasOrdenadas = computed(() => {
    const impacto = this.normalizeText(this.filtroNivelImpacto()).toUpperCase();
    const ordenarPor = this.ordenarPor();

    return [...this.alertas()]
      .filter((alerta) => !impacto || this.normalizeText(alerta.nivelImpacto).toUpperCase() === impacto)
      .sort((left, right) => this.sortValue(right, ordenarPor) - this.sortValue(left, ordenarPor));
  });
  readonly productosSinRotacion = computed(
    () =>
      this.alertas().filter((alerta) => {
        const tipo = this.normalizeText(alerta.tipoAlerta).toUpperCase();
        const estado = this.normalizeText(alerta.estadoRotacion).toUpperCase();
        return (
          tipo.includes('SIN_VENTA') ||
          tipo.includes('SIN_MOVIMIENTO') ||
          tipo.includes('ROTACION') ||
          estado.includes('LENTA') ||
          estado.includes('SIN')
        );
      }).length
  );
  readonly prioridadSeleccionada = computed(() => {
    const prioridad = this.normalizeText(this.filtroPrioridad()).toUpperCase();
    return prioridad ? this.prioridadDescriptions[prioridad] ?? null : null;
  });

  ngOnInit(): void {
    this.cargarLineas();
  }

  cargarLineas(): void {
    this.lineasLoading.set(true);
    this.lineaProductoService
      .getLineas()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.lineasLoading.set(false))
      )
      .subscribe({
        next: (lineas) => this.lineas.set(lineas ?? []),
        error: () => this.lineas.set([])
      });
  }

  seleccionarLinea(codigoLinea: string): void {
    const lineaSeleccionada = this.lineas().find((item) => item.CAC02_CodLinea === codigoLinea);

    this.lineaCodigo.set(codigoLinea);
    this.linea.set(lineaSeleccionada?.CAC02_LineaProdu ?? '');
    this.categoria.set('');
    this.categorias.set([]);
    this.pageNumber.set(1);

    if (!codigoLinea) {
      return;
    }

    this.categoriasLoading.set(true);
    this.categoriaProductoService
      .getCategoriasPorLinea(codigoLinea)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.categoriasLoading.set(false))
      )
      .subscribe({
        next: (categorias) => this.categorias.set(categorias ?? []),
        error: () => this.categorias.set([])
      });
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

  limpiarProveedor(): void {
    this.proveedor.set('');
    this.proveedorSearch.set('');
    this.proveedores.set([]);
    this.pageNumber.set(1);
  }

  alternarFiltrosAvanzados(): void {
    this.mostrarAvanzados.update((value) => !value);
  }

  alternarConfiguracionTecnica(): void {
    this.mostrarTecnicos.update((value) => !value);
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

    const filtros = this.buildFiltros();

    this.buscarPendiente = false;
    this.busquedaEjecutada.set(true);
    this.loading.set(true);
    this.error.set(null);

    this.alertasService
      .obtenerAlertas(filtros)
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
          this.alertas.set(response.data ?? []);
          this.metadata.set(response.metadata ?? null);
          if (!response.success) {
            this.error.set(response.message || 'La consulta de alertas no fue exitosa.');
          }
        },
        error: () => {
          this.alertas.set([]);
          this.metadata.set(null);
          this.error.set('No fue posible cargar las alertas desde el API.');
        }
      });
  }

  limpiar(): void {
    this.pageNumber.set(1);
    this.pageSize.set(50);
    this.severidad.set('');
    this.codigoProducto.set('');
    this.codigoAlmacen.set('PRINCIP');
    this.categoria.set('');
    this.linea.set('');
    this.lineaCodigo.set('');
    this.proveedor.set('');
    this.proveedorSearch.set('');
    this.categorias.set([]);
    this.proveedores.set([]);
    this.diasAnalisis.set(30);
    this.diasSinVenta.set(60);
    this.diasSobreStock.set(null);
    this.diasCritico.set(null);
    this.margenBajo.set(null);
    this.capitalAlto.set(null);
    this.filtroPrioridad.set('');
    this.filtroTipoAlerta.set('');
    this.filtroNivelImpacto.set('');
    this.ordenarPor.set('scorePrioridad');
    this.registrarLog.set(false);
    this.debug.set(false);
    this.alertas.set([]);
    this.metadata.set(null);
    this.error.set(null);
    this.busquedaEjecutada.set(false);
  }

  cambiarPagina(delta: number): void {
    const nextPage = Math.min(this.totalPaginas(), Math.max(1, this.pageNumber() + delta));
    if (nextPage === this.pageNumber()) {
      return;
    }

    this.pageNumber.set(nextPage);
    this.buscar();
  }

  private buildFiltros(): ComprasInteligentesAlertasFiltros {
    return {
      pageNumber: this.toPositiveNumber(this.pageNumber(), 1),
      pageSize: this.toPositiveNumber(this.pageSize(), 50),
      codigoProducto: this.codigoProducto(),
      codigoAlmacen: this.codigoAlmacen(),
      categoria: this.categoria(),
      linea: this.linea(),
      proveedor: this.resolveProveedorCodigo(),
      diasAnalisis: this.toOptionalNumber(this.diasAnalisis()),
      diasSinVenta: this.toOptionalNumber(this.diasSinVenta()),
      diasSobreStock: this.toOptionalNumber(this.diasSobreStock()),
      diasCritico: this.toOptionalNumber(this.diasCritico()),
      margenBajo: this.toOptionalNumber(this.margenBajo()),
      capitalAlto: this.toOptionalNumber(this.capitalAlto()),
      filtroPrioridad: this.filtroPrioridad(),
      filtroTipoAlerta: this.filtroTipoAlerta(),
      registrarLog: this.registrarLog(),
      debug: this.debug()
    };
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

  private sortValue(alerta: ComprasInteligentesAlerta, key: string): number {
    const value = alerta[key as keyof ComprasInteligentesAlerta];
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
  }

  private kpiNumber(kpis: ComprasInteligentesAlertasMetadata['kpIs'] | null, key: keyof ComprasInteligentesAlertasMetadata['kpIs']): number {
    if (!kpis) {
      return 0;
    }

    const value = Number(kpis[key]);
    return Number.isFinite(value) ? value : 0;
  }

  private kpiString(kpis: ComprasInteligentesAlertasMetadata['kpIs'] | null, key: keyof ComprasInteligentesAlertasMetadata['kpIs']): string {
    if (!kpis) {
      return '';
    }

    const value = kpis[key];
    return typeof value === 'string' ? value.trim() : '';
  }

  private formatDateRange(fechaDesde: string, fechaHasta: string): string {
    const desde = this.formatDate(fechaDesde);
    const hasta = this.formatDate(fechaHasta);

    if (desde && hasta) {
      return `${desde} al ${hasta}`;
    }

    return desde || hasta || 'Periodo no disponible';
  }

  private formatDate(value: string): string {
    if (!value) {
      return '';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString('es-CR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  private isLikelyProveedorCodigo(value: string): boolean {
    const normalized = this.normalizeText(value);
    return normalized.length > 0 && normalized.length <= 20 && /[0-9]/.test(normalized) && /^[a-zA-Z0-9._-]+$/.test(normalized);
  }

  private normalizeText(value: string | null | undefined): string {
    return (value ?? '').trim();
  }
}
