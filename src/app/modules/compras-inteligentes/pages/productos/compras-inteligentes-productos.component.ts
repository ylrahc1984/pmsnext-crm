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
import { FiltrosRotacionInventario } from 'src/app/modules/inteligencia-comercial/interfaces/filtros-rotacion.interface';
import { KpisRotacionInventario } from 'src/app/modules/inteligencia-comercial/interfaces/kpis-rotacion.interface';
import { RotacionInventario } from 'src/app/modules/inteligencia-comercial/interfaces/rotacion-inventario.interface';
import { RotacionMetadata } from 'src/app/modules/inteligencia-comercial/interfaces/rotacion-response.interface';
import { InteligenciaComercialService } from 'src/app/modules/inteligencia-comercial/services/inteligencia-comercial.service';
import { OperationalWidgetComponent } from '../../components/operational-widget/operational-widget.component';

type BadgeTone = 'success' | 'warning' | 'danger' | 'danger-strong' | 'muted' | 'info';
type MarginTone = 'positive' | 'neutral' | 'negative';
type ProductBadge = { label: string; tone: BadgeTone };
type ProductStatusMessage = { text: string; tone: BadgeTone; icon: string };

@Component({
  selector: 'app-compras-inteligentes-productos',
  standalone: true,
  imports: [CommonModule, FormsModule, OperationalWidgetComponent],
  templateUrl: './compras-inteligentes-productos.component.html',
  styleUrls: ['../compras-inteligentes-page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ComprasInteligentesProductosComponent implements OnInit {
  private readonly inteligenciaService = inject(InteligenciaComercialService);
  private readonly lineaProductoService = inject(LineaProductoService);
  private readonly categoriaProductoService = inject(CategoriaProductoService);
  private readonly proveedorService = inject(ProveedorService);
  private readonly destroyRef = inject(DestroyRef);
  private proveedorSearchTimer: ReturnType<typeof setTimeout> | null = null;
  private buscarPendiente = false;

  readonly productos = signal<RotacionInventario[]>([]);
  readonly metadata = signal<RotacionMetadata | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly busquedaEjecutada = signal(false);

  readonly pageNumber = signal(1);
  readonly pageSize = signal(50);
  readonly clasificacion = signal('');
  readonly estadoRotacion = signal('');
  readonly codigoProducto = signal('');
  readonly codigoAlmacen = signal('PRINCIP');
  readonly categoria = signal('');
  readonly linea = signal('');
  readonly lineaCodigo = signal('');
  readonly proveedor = signal('');
  readonly proveedorSearch = signal('');
  readonly diasAnalisis = signal<number | null>(30);

  readonly lineas = signal<LineaProducto[]>([]);
  readonly categorias = signal<CategoriaProducto[]>([]);
  readonly proveedores = signal<ProveedorUI[]>([]);
  readonly lineasLoading = signal(false);
  readonly categoriasLoading = signal(false);
  readonly proveedoresLoading = signal(false);
  readonly mostrarAvanzados = signal(false);
  readonly mostrarTecnicos = signal(false);

  readonly clasificacionOptions = [
    'AGOTADO',
    'CRITICO',
    'INVENTARIO INMOVIL',
    'RIESGO',
    'SALUDABLE',
    'SIN CREDITO',
    'SIN DATOS'
  ];
  readonly estadoRotacionOptions = [
    'AGOTADO',
    'SIN CONSUMO',
    'ROTACION RAPIDA',
    'ROTACION NORMAL',
    'ROTACION LENTA',
    'SOBRE STOCK',
    'SIN DATOS'
  ];
  readonly kpis = computed(() => this.metadata()?.kpIs ?? null);
  readonly productosFiltrados = computed(() => {
    const clasificacion = this.normalizeForCompare(this.clasificacion());
    const estadoRotacion = this.normalizeForCompare(this.estadoRotacion());
    const productos = this.productos();

    if (!clasificacion && !estadoRotacion) {
      return productos;
    }

    return productos.filter(
      (producto) => this.matchesClasificacion(producto, clasificacion) && this.matchesEstadoRotacion(producto, estadoRotacion)
    );
  });
  readonly totalRegistros = computed(() => {
    if (this.normalizeText(this.clasificacion()) || this.normalizeText(this.estadoRotacion())) {
      return this.productosFiltrados().length;
    }

    return this.metadata()?.totalRegistros ?? this.productos().length;
  });
  readonly totalPaginas = computed(() => Math.max(1, this.metadata()?.totalPaginas ?? 1));
  readonly filtrosBloqueados = computed(() => this.loading() || this.proveedoresLoading());
  readonly kpiResumen = computed(() => {
    const kpis = this.kpis();

    return {
      saludables: this.kpiNumber(kpis, 'TotalSaludables', 'totalSaludables'),
      riesgo: this.kpiNumber(kpis, 'TotalRiesgo', 'totalRiesgo', 'TotalEnRiesgo', 'totalEnRiesgo'),
      criticos: this.kpiNumber(kpis, 'TotalCriticos', 'totalCriticos', 'TotalCriticosSalud', 'totalCriticosSalud'),
      rapida: this.kpiNumber(kpis, 'TotalRotacionRapida', 'totalRotacionRapida'),
      normal: this.kpiNumber(kpis, 'TotalRotacionNormal', 'totalRotacionNormal'),
      lenta: this.kpiNumber(kpis, 'TotalRotacionLenta', 'totalRotacionLenta'),
      sobreStock: this.kpiNumber(kpis, 'TotalSobreStock', 'totalSobreStock'),
      promedioDiasInventario:
        this.kpiOptionalNumber(kpis, 'PromedioDiasInventario', 'promedioDiasInventario') ?? this.promedioLocal('diasInventario'),
      promedioMargenFinanciero: this.kpiOptionalNumber(kpis, 'PromedioMargenFinanciero', 'promedioMargenFinanciero')
    };
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

  aplicarFiltros(): void {
    if (this.filtrosBloqueados()) {
      return;
    }

    this.pageNumber.set(1);
    this.buscar();
  }

  cambiarClasificacion(value: string): void {
    this.clasificacion.set(value);
    this.pageNumber.set(1);
    this.buscarSiYaHayConsulta();
  }

  cambiarEstadoRotacion(value: string): void {
    this.estadoRotacion.set(value);
    this.pageNumber.set(1);
    this.buscarSiYaHayConsulta();
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
      .getRotacionInventario(this.buildFiltros())
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
          this.productos.set(response.data ?? []);
          this.metadata.set(response.metadata ?? null);
          if (!response.success) {
            this.error.set(response.message || 'La consulta de rotacion no fue exitosa.');
          }
        },
        error: () => {
          this.productos.set([]);
          this.metadata.set(null);
          this.error.set('No fue posible cargar la salud de inventario desde el API.');
        }
      });
  }

  limpiar(): void {
    this.pageNumber.set(1);
    this.pageSize.set(50);
    this.clasificacion.set('');
    this.estadoRotacion.set('');
    this.codigoProducto.set('');
    this.codigoAlmacen.set('PRINCIP');
    this.categoria.set('');
    this.linea.set('');
    this.lineaCodigo.set('');
    this.proveedor.set('');
    this.proveedorSearch.set('');
    this.diasAnalisis.set(30);
    this.categorias.set([]);
    this.proveedores.set([]);
    this.productos.set([]);
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

  alternarFiltrosAvanzados(): void {
    this.mostrarAvanzados.update((value) => !value);
  }

  alternarConfiguracionTecnica(): void {
    this.mostrarTecnicos.update((value) => !value);
  }

  healthTone(value: string | null | undefined): BadgeTone {
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

    if (normalized.includes('INVENTARIO INMOVIL') || normalized.includes('INMOVIL')) {
      return 'danger';
    }

    return 'muted';
  }

  rotationTone(value: string | null | undefined): BadgeTone {
    const normalized = this.normalizeForCompare(value);

    if (normalized.includes('AGOTADO')) {
      return 'danger-strong';
    }

    if (normalized.includes('SIN CONSUMO')) {
      return 'muted';
    }

    if (normalized.includes('ROTACION RAPIDA')) {
      return 'info';
    }

    if (normalized.includes('ROTACION NORMAL')) {
      return 'success';
    }

    if (normalized.includes('ROTACION LENTA')) {
      return 'warning';
    }

    if (normalized.includes('SOBRE STOCK')) {
      return 'danger';
    }

    return 'muted';
  }

  marginTone(value: number | null | undefined): MarginTone {
    const numeric = Number(value);

    if (!Number.isFinite(numeric)) {
      return 'neutral';
    }

    if (numeric < 0) {
      return 'negative';
    }

    if (numeric <= 5) {
      return 'neutral';
    }

    return 'positive';
  }

  healthLabel(value: string | null | undefined): string {
    const normalized = this.normalizeForCompare(value);

    if (normalized.includes('SALUDABLE')) {
      return 'SALUDABLE';
    }

    if (normalized.includes('RIESGO')) {
      return 'RIESGO';
    }

    if (normalized.includes('CRITICO')) {
      return 'CRITICO';
    }

    if (normalized.includes('AGOTADO')) {
      return 'AGOTADO';
    }

    if (normalized.includes('INVENTARIO INMOVIL') || normalized.includes('INMOVIL')) {
      return 'INVENTARIO INMOVIL';
    }

    if (normalized.includes('SIN CREDITO')) {
      return 'SIN CREDITO';
    }

    return 'SIN DATOS';
  }

  rotationLabel(value: string | null | undefined): string {
    const normalized = this.normalizeForCompare(value);
    const labels = ['AGOTADO', 'SIN CONSUMO', 'ROTACION RAPIDA', 'ROTACION NORMAL', 'ROTACION LENTA', 'SOBRE STOCK'];

    return labels.find((label) => normalized.includes(label)) ?? 'SIN DATOS';
  }

  productBadges(producto: RotacionInventario): ProductBadge[] {
    const badges: ProductBadge[] = [
      {
        label: this.healthLabel(producto.saludInventario),
        tone: this.healthTone(producto.saludInventario)
      },
      {
        label: this.rotationLabel(producto.estadoRotacion),
        tone: this.rotationTone(producto.estadoRotacion)
      }
    ];

    const uniqueBadges = badges.filter(
      (badge, index, items) => badge.label !== 'SIN DATOS' && items.findIndex((item) => item.label === badge.label) === index
    );

    return uniqueBadges.length > 0 ? uniqueBadges : [{ label: 'SIN DATOS', tone: 'muted' }];
  }

  primaryProductBadge(producto: RotacionInventario): ProductBadge {
    return this.productBadges(producto)[0];
  }

  statusMessage(producto: RotacionInventario): ProductStatusMessage {
    const health = this.healthLabel(producto.saludInventario);
    const rotation = this.rotationLabel(producto.estadoRotacion);

    if (health === 'CRITICO') {
      return {
        text: 'Se paga antes de venderse',
        tone: 'danger-strong',
        icon: 'icon-alert-triangle'
      };
    }

    if (health === 'RIESGO') {
      return {
        text: 'Cercano al limite financiero',
        tone: 'warning',
        icon: 'icon-alert-circle'
      };
    }

    if (health === 'AGOTADO' || rotation === 'AGOTADO') {
      return {
        text: 'Inventario agotado',
        tone: 'danger-strong',
        icon: 'icon-alert-triangle'
      };
    }

    if (health === 'INVENTARIO INMOVIL' || rotation === 'SIN CONSUMO') {
      return {
        text: 'Sin rotacion en el periodo',
        tone: 'danger',
        icon: 'icon-alert-circle'
      };
    }

    if (rotation === 'SOBRE STOCK') {
      return {
        text: 'Cobertura elevada con capital inmovilizado',
        tone: 'danger',
        icon: 'icon-package'
      };
    }

    if (rotation === 'ROTACION LENTA') {
      return {
        text: 'Consumo bajo frente al stock disponible',
        tone: 'warning',
        icon: 'icon-clock'
      };
    }

    if (health === 'SIN CREDITO') {
      return {
        text: 'No aplica analisis financiero por credito',
        tone: 'muted',
        icon: 'icon-info'
      };
    }

    return {
      text: 'Inventario dentro de parametros operativos',
      tone: 'success',
      icon: 'icon-check-circle'
    };
  }

  classificationTooltip(value: string | null | undefined): string {
    const label = this.healthLabel(value);
    const descriptions: Record<string, string> = {
      SALUDABLE: 'Dias inventario menor al 80% del credito. Se vende antes del plazo de pago.',
      RIESGO: 'Dias inventario entre 80% y 100% del credito. Cercano al limite financiero.',
      CRITICO: 'Dias inventario mayor al credito del proveedor. Se paga antes de venderse.',
      AGOTADO: 'Stock actual menor o igual a cero. Caso especial de ruptura.',
      'INVENTARIO INMOVIL': 'Cantidad consumida menor o igual a cero. Sin rotacion en el periodo.',
      'SIN CREDITO': 'Dias credito proveedor menor o igual a cero. No aplica analisis financiero.',
      'SIN DATOS': 'No hay informacion suficiente para clasificar la salud del inventario.'
    };

    return descriptions[label] ?? descriptions['SIN DATOS'];
  }

  rotationTooltip(value: string | null | undefined): string {
    const label = this.rotationLabel(value);
    const descriptions: Record<string, string> = {
      AGOTADO: 'No hay stock disponible para cubrir demanda.',
      'SIN CONSUMO': 'No registra consumo en la ventana de analisis.',
      'ROTACION RAPIDA': 'El producto sale rapidamente y requiere seguimiento de reposicion.',
      'ROTACION NORMAL': 'El comportamiento de consumo esta dentro de un rango estable.',
      'ROTACION LENTA': 'El consumo es bajo frente al stock disponible.',
      'SOBRE STOCK': 'La cobertura supera el nivel esperado y puede inmovilizar capital.',
      'SIN DATOS': 'No hay informacion suficiente para clasificar la rotacion.'
    };

    return descriptions[label] ?? descriptions['SIN DATOS'];
  }

  hasNumericValue(value: number | null | undefined): boolean {
    return Number.isFinite(Number(value));
  }

  trackByProducto(_index: number, producto: RotacionInventario): string {
    return `${producto.codAlmacen}-${producto.codProducto}`;
  }

  private buildFiltros(): FiltrosRotacionInventario {
    return {
      pageNumber: this.toPositiveNumber(this.pageNumber(), 1),
      pageSize: this.toPositiveNumber(this.pageSize(), 50),
      codigoProducto: this.codigoProducto(),
      codigoAlmacen: this.codigoAlmacen(),
      categoria: this.categoria(),
      linea: this.linea(),
      proveedor: this.resolveProveedorCodigo(),
      saludInventario: this.clasificacion(),
      estadoRotacion: this.estadoRotacion(),
      diasAnalisis: this.toOptionalNumber(this.diasAnalisis())
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

  private kpiNumber(kpis: KpisRotacionInventario | null, ...keys: string[]): number {
    return this.kpiOptionalNumber(kpis, ...keys) ?? 0;
  }

  private kpiOptionalNumber(kpis: KpisRotacionInventario | null, ...keys: string[]): number | null {
    if (!kpis) {
      return null;
    }

    const source = kpis as unknown as Record<string, unknown>;
    for (const key of keys) {
      const value = Number(source[key]);
      if (Number.isFinite(value)) {
        return value;
      }
    }

    return null;
  }

  private promedioLocal(key: keyof Pick<RotacionInventario, 'diasInventario' | 'margenDiasFinanciero'>): number {
    const values = this.productos()
      .map((producto) => Number(producto[key]))
      .filter((value) => Number.isFinite(value));

    if (values.length === 0) {
      return 0;
    }

    const total = values.reduce((acc, value) => acc + value, 0);
    return total / values.length;
  }

  private matchesClasificacion(producto: RotacionInventario, clasificacion: string): boolean {
    if (!clasificacion) {
      return true;
    }

    const saludInventario = this.productoText(producto, 'saludInventario', 'SaludInventario');
    const health = this.normalizeForCompare(saludInventario);
    const healthLabel = this.normalizeForCompare(this.healthLabel(saludInventario));

    return health === clasificacion || healthLabel === clasificacion;
  }

  private matchesEstadoRotacion(producto: RotacionInventario, estadoRotacion: string): boolean {
    if (!estadoRotacion) {
      return true;
    }

    const rotation = this.normalizeForCompare(this.productoText(producto, 'estadoRotacion', 'EstadoRotacion'));

    return rotation === estadoRotacion;
  }

  private buscarSiYaHayConsulta(): void {
    if (!this.busquedaEjecutada() || this.filtrosBloqueados()) {
      return;
    }

    this.buscar();
  }

  private productoText(producto: RotacionInventario, ...keys: string[]): string {
    const source = producto as unknown as Record<string, unknown>;

    for (const key of keys) {
      const value = source[key];
      if (value !== null && value !== undefined) {
        return String(value);
      }
    }

    return '';
  }

  private isLikelyProveedorCodigo(value: string): boolean {
    const normalized = this.normalizeText(value);
    return normalized.length > 0 && normalized.length <= 20 && /[0-9]/.test(normalized) && /^[a-zA-Z0-9._-]+$/.test(normalized);
  }

  private normalizeForCompare(value: string | null | undefined): string {
    return this.normalizeText(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .toUpperCase();
  }

  private normalizeText(value: string | null | undefined): string {
    return (value ?? '').trim();
  }
}
