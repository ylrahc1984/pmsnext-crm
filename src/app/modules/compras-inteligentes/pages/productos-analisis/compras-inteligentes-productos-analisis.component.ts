import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, NonNullableFormBuilder } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize, map } from 'rxjs/operators';

import { CategoriaProducto } from 'src/app/demo/compras/categoria-producto/interfaces/CategoriaProducto.interface';
import { CategoriaProductoService } from 'src/app/demo/compras/categoria-producto/categoria-producto.service';
import { LineaProducto } from 'src/app/demo/compras/linea-producto/interfaces/LineaProducto.interface';
import { LineaProductoService } from 'src/app/demo/compras/linea-producto/linea-producto.service';
import { ProveedorService, ProveedorUI } from 'src/app/demo/compras/proveedores/proveedor.service';
import { FiltrosProductos } from 'src/app/modules/inteligencia-comercial/interfaces/filtros-productos.interface';
import { ProductoAnalisis } from 'src/app/modules/inteligencia-comercial/interfaces/producto-analisis.interface';
import { PaginationMetadata } from 'src/app/modules/inteligencia-comercial/interfaces/paginacion-metadata.interface';
import { InteligenciaComercialService } from 'src/app/modules/inteligencia-comercial/services/inteligencia-comercial.service';
import { OperationalWidgetComponent } from '../../components/operational-widget/operational-widget.component';

type Tone = 'success' | 'warning' | 'orange' | 'danger' | 'danger-strong' | 'muted' | 'info' | 'finance';
type KpiCard = { label: string; value: string; note: string; icon: string; tone: Tone };
type InsightLine = { text: string; tone: Tone; icon: string };

type ProductoAnalisisKpis = {
  totalProductos?: number;
  productosAgotados?: number;
  productosStockNegativo?: number;
  ventaNetaTotal?: number;
  utilidadBrutaTotal?: number;
  margenPromedio?: number;
  valorInventarioEstimado?: number;
  productosInactivos?: number;
};

@Component({
  selector: 'app-compras-inteligentes-productos-analisis',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, OperationalWidgetComponent],
  templateUrl: './compras-inteligentes-productos-analisis.component.html',
  styleUrls: ['../compras-inteligentes-page.scss', './compras-inteligentes-productos-analisis.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ComprasInteligentesProductosAnalisisComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly inteligenciaService = inject(InteligenciaComercialService);
  private readonly lineaProductoService = inject(LineaProductoService);
  private readonly categoriaProductoService = inject(CategoriaProductoService);
  private readonly proveedorService = inject(ProveedorService);
  private readonly destroyRef = inject(DestroyRef);
  private proveedorSearchTimer: ReturnType<typeof setTimeout> | null = null;
  private buscarPendiente = false;
  private readonly defaultDateRange = this.getDefaultDateRange();

  readonly filtrosForm = this.fb.group({
    codigoProducto: [''],
    categoria: [''],
    lineaCodigo: [''],
    linea: [''],
    proveedor: [''],
    proveedorSearch: [''],
    codigoAlmacen: ['PRINCIP'],
    estadoProducto: [''],
    fechaDesde: [this.defaultDateRange.fechaDesde],
    fechaHasta: [this.defaultDateRange.fechaHasta],
    pageSize: [25]
  });

  readonly productos = signal<ProductoAnalisis[]>([]);
  readonly metadata = signal<PaginationMetadata | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly busquedaEjecutada = signal(false);
  readonly pageNumber = signal(1);

  readonly lineas = signal<LineaProducto[]>([]);
  readonly categorias = signal<CategoriaProducto[]>([]);
  readonly proveedores = signal<ProveedorUI[]>([]);
  readonly lineasLoading = signal(false);
  readonly categoriasLoading = signal(false);
  readonly proveedoresLoading = signal(false);
  readonly estadoProductoOptions = ['AGOTADO', 'SIN VENTAS', 'SIN MOVIMIENTO', 'MOVIMIENTO LENTO', 'ACTIVO', 'SIN CLASIFICAR'];

  readonly totalPaginas = computed(() => Math.max(1, Number(this.metadata()?.totalPaginas) || 1));
  readonly totalRegistros = computed(() => Number(this.metadata()?.totalRegistros) || this.productos().length);
  readonly filtrosBloqueados = computed(
    () => this.loading() || this.proveedoresLoading() || this.lineasLoading() || this.categoriasLoading()
  );

  readonly resumen = computed(() => {
    const productos = this.productos();
    const metadataKpis = (this.metadata()?.kpIs ?? {}) as ProductoAnalisisKpis;
    const ventaNetaTotal = this.sum(productos, 'ventaNeta');
    const utilidadBrutaTotal = this.sum(productos, 'utilidadBrutaTotal');
    const margenValues = productos.map((item) => Number(item.margenPorcentaje)).filter((value) => Number.isFinite(value));

    return {
      totalProductos: this.kpiNumber(metadataKpis.totalProductos, productos.length),
      productosAgotados: this.kpiNumber(metadataKpis.productosAgotados, productos.filter((item) => item.esAgotado).length),
      productosStockNegativo: this.kpiNumber(metadataKpis.productosStockNegativo, productos.filter((item) => Number(item.stockActual) < 0).length),
      ventaNetaTotal: this.kpiNumber(metadataKpis.ventaNetaTotal, ventaNetaTotal),
      utilidadBrutaTotal: this.kpiNumber(metadataKpis.utilidadBrutaTotal, utilidadBrutaTotal),
      margenPromedio: this.kpiNumber(
        metadataKpis.margenPromedio,
        margenValues.length ? margenValues.reduce((acc, value) => acc + value, 0) / margenValues.length : 0
      ),
      valorInventarioEstimado: this.kpiNumber(metadataKpis.valorInventarioEstimado, this.sum(productos, 'valorInventarioEstimado')),
      productosInactivos: this.kpiNumber(metadataKpis.productosInactivos, productos.filter((item) => item.esProductoInactivo).length),
      mas60SinVenta: productos.filter((item) => Number(item.diasSinVenta) > 60).length,
      margenBajo: productos.filter((item) => Number(item.margenPorcentaje) < 10).length
    };
  });

  readonly kpiCards = computed<KpiCard[]>(() => {
    const kpis = this.resumen();

    return [
      { label: 'Productos listados', value: this.formatNumber(kpis.totalProductos), note: `${this.formatNumber(this.totalRegistros())} registros`, icon: 'icon-package', tone: 'info' },
      { label: 'Agotados', value: this.formatNumber(kpis.productosAgotados), note: 'Ruptura visible', icon: 'icon-alert-triangle', tone: 'danger-strong' },
      { label: 'Stock negativo', value: this.formatNumber(kpis.productosStockNegativo), note: 'Validar inventario', icon: 'icon-minus-circle', tone: 'danger' },
      { label: 'Venta neta', value: this.formatCurrency(kpis.ventaNetaTotal), note: 'Pagina actual', icon: 'icon-dollar-sign', tone: 'finance' },
      { label: 'Utilidad bruta', value: this.formatCurrency(kpis.utilidadBrutaTotal), note: 'Contribucion', icon: 'icon-trending-up', tone: 'success' },
      { label: 'Margen promedio', value: this.formatPercent(kpis.margenPromedio), note: this.marginLabel(kpis.margenPromedio), icon: 'icon-percent', tone: this.marginTone(kpis.margenPromedio) },
      { label: 'Valor inventario', value: this.formatCurrency(kpis.valorInventarioEstimado), note: kpis.valorInventarioEstimado < 0 ? 'Advertencia contable' : 'Estimado', icon: 'icon-archive', tone: kpis.valorInventarioEstimado < 0 ? 'warning' : 'finance' },
      { label: 'Inactivos', value: this.formatNumber(kpis.productosInactivos), note: 'Sin movimiento relevante', icon: 'icon-pause-circle', tone: 'muted' }
    ];
  });

  readonly insights = computed<InsightLine[]>(() => {
    const kpis = this.resumen();
    const productos = this.productos();
    const totalUtility = kpis.utilidadBrutaTotal;
    const totalSales = kpis.ventaNetaTotal;
    const utilityShare = totalSales > 0 ? (totalUtility / totalSales) * 100 : 0;
    const sortedUtility = [...productos].sort((a, b) => (Number(b.utilidadBrutaTotal) || 0) - (Number(a.utilidadBrutaTotal) || 0));
    let accumulatedUtility = 0;
    let productsToEightyPercent = 0;

    for (const producto of sortedUtility) {
      if (totalUtility <= 0 || accumulatedUtility >= totalUtility * 0.8) {
        break;
      }
      accumulatedUtility += Number(producto.utilidadBrutaTotal) || 0;
      productsToEightyPercent += 1;
    }

    const mas30SinCompra = productos.filter((item) => Number(item.diasSinCompra) > 30).length;

    return [
      {
        text:
          productsToEightyPercent > 0
            ? `El 80% de la utilidad se concentra en ${this.formatNumber(productsToEightyPercent)} productos.`
            : 'Sin utilidad positiva para medir concentracion en esta pagina.',
        tone: productsToEightyPercent > 0 && productsToEightyPercent <= 2 ? 'info' : 'muted',
        icon: 'icon-pie-chart'
      },
      { text: `Hay ${this.formatNumber(kpis.margenBajo)} productos con margen menor al 10%.`, tone: kpis.margenBajo > 0 ? 'warning' : 'success', icon: 'icon-percent' },
      { text: `Existen ${this.formatNumber(mas30SinCompra)} productos con mas de 30 dias sin reposicion.`, tone: mas30SinCompra > 0 ? 'orange' : 'success', icon: 'icon-truck' },
      { text: `Hay ${this.formatNumber(kpis.productosStockNegativo)} productos con stock negativo.`, tone: kpis.productosStockNegativo > 0 ? 'danger' : 'success', icon: 'icon-minus-circle' },
      { text: `Hay ${this.formatNumber(kpis.productosAgotados)} productos agotados.`, tone: kpis.productosAgotados > 0 ? 'danger-strong' : 'success', icon: 'icon-alert-triangle' },
      { text: `La utilidad acumulada representa ${this.formatPercent(utilityShare)} de la venta neta.`, tone: utilityShare < 10 ? 'warning' : 'finance', icon: 'icon-trending-up' }
    ];
  });

  ngOnInit(): void {
    this.cargarCatalogos();
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
      .obtenerProductos(this.buildFiltros())
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
            this.error.set(response.message || 'La consulta de analisis de productos no fue exitosa.');
          }
        },
        error: () => {
          this.productos.set([]);
          this.metadata.set(null);
          this.error.set('No fue posible cargar el analisis de productos desde el API.');
        }
      });
  }

  aplicarFiltros(): void {
    if (this.filtrosBloqueados()) {
      return;
    }

    this.pageNumber.set(1);
    this.buscar();
  }

  actualizar(): void {
    this.buscar();
  }

  limpiar(): void {
    this.pageNumber.set(1);
    this.filtrosForm.reset({
      codigoProducto: '',
      categoria: '',
      lineaCodigo: '',
      linea: '',
      proveedor: '',
      proveedorSearch: '',
      codigoAlmacen: 'PRINCIP',
      estadoProducto: '',
      fechaDesde: this.defaultDateRange.fechaDesde,
      fechaHasta: this.defaultDateRange.fechaHasta,
      pageSize: 25
    });
    this.categorias.set([]);
    this.proveedores.set([]);
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

  cambiarPageSize(): void {
    this.pageNumber.set(1);
    if (this.busquedaEjecutada()) {
      this.buscar();
    }
  }

  seleccionarLinea(codigoLinea: string): void {
    const linea = this.lineas().find((item) => item.CAC02_CodLinea === codigoLinea);
    this.filtrosForm.patchValue({
      lineaCodigo: codigoLinea,
      linea: linea?.CAC02_LineaProdu ?? '',
      categoria: ''
    });
    this.pageNumber.set(1);
    this.categorias.set([]);

    if (codigoLinea) {
      this.cargarCategorias(codigoLinea);
    }
  }

  buscarProveedores(term: string): void {
    this.filtrosForm.patchValue({ proveedorSearch: term, proveedor: '' }, { emitEvent: false });

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
    this.filtrosForm.patchValue({
      proveedor: codigo,
      proveedorSearch: `${codigo} - ${proveedor.descripcion}`
    });
    this.proveedores.set([]);
    this.pageNumber.set(1);
  }

  estadoTone(producto: ProductoAnalisis): Tone {
    const estado = this.normalizeForCompare(producto.estadoProducto);
    if (estado === 'AGOTADO') {
      return 'danger-strong';
    }
    if (estado === 'SIN MOVIMIENTO') {
      return 'orange';
    }
    if (estado === 'MOVIMIENTO LENTO') {
      return 'warning';
    }
    if (estado === 'ACTIVO') {
      return 'success';
    }
    return 'muted';
  }

  proveedorCorto(producto: ProductoAnalisis): string {
    const proveedor = this.normalizeText(producto.nomProveedorPrincipal) || 'Sin proveedor';
    return proveedor.length > 32 ? `${proveedor.slice(0, 32).trim()}...` : proveedor;
  }

  stockTone(producto: ProductoAnalisis): Tone {
    const stock = Number(producto.stockActual) || 0;
    if (stock < 0) {
      return 'danger';
    }
    if (stock === 0) {
      return 'warning';
    }
    return 'success';
  }

  stockLabel(producto: ProductoAnalisis): string {
    const stock = Number(producto.stockActual) || 0;
    if (stock < 0) {
      return 'Stock negativo';
    }
    if (stock === 0) {
      return 'Sin stock';
    }
    return 'Con stock';
  }

  movimientoTone(producto: ProductoAnalisis): Tone {
    const movimiento = Number(producto.movimientoNetoPeriodo) || 0;
    if (movimiento < 0) {
      return 'warning';
    }
    if (movimiento > 0) {
      return 'success';
    }
    return 'muted';
  }

  margenTone(producto: ProductoAnalisis): Tone {
    return this.marginTone(Number(producto.margenPorcentaje) || 0);
  }

  diasSinVentaTone(producto: ProductoAnalisis): Tone {
    const dias = Number(producto.diasSinVenta);
    if (!Number.isFinite(dias)) {
      return 'muted';
    }
    if (dias > 60) {
      return 'danger';
    }
    if (dias >= 30) {
      return 'warning';
    }
    return 'success';
  }

  inventoryValueTone(producto: ProductoAnalisis): Tone {
    return Number(producto.valorInventarioEstimado) < 0 ? 'warning' : 'finance';
  }

  formatCurrency(value: number | null | undefined): string {
    return new Intl.NumberFormat('es-CR', {
      style: 'currency',
      currency: 'CRC',
      maximumFractionDigits: 0
    }).format(Number(value) || 0);
  }

  formatPercent(value: number | null | undefined): string {
    return `${this.formatNumber(value, '1.0-1')}%`;
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

  formatDate(value: string | null | undefined): string {
    if (!value) {
      return 'Sin registro';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return 'Sin registro';
    }

    return new Intl.DateTimeFormat('es-CR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  }

  formatShortDate(value: string | null | undefined): string {
    if (!value) {
      return '-';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '-';
    }

    return new Intl.DateTimeFormat('es-CR', {
      day: '2-digit',
      month: '2-digit'
    }).format(date);
  }

  formatNullableNumber(value: number | null | undefined, suffix = ''): string {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) {
      return 'Sin registro';
    }

    return `${this.formatNumber(value)}${suffix}`;
  }

  trackByProducto(_index: number, producto: ProductoAnalisis): string {
    return `${producto.codAlmacen}-${producto.codProducto}`;
  }

  private cargarCatalogos(): void {
    this.cargarLineas();
  }

  private cargarLineas(): void {
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

  private cargarCategorias(linea: string): void {
    this.categoriasLoading.set(true);
    this.categoriaProductoService
      .getCategoriasPorLinea(linea)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.categoriasLoading.set(false))
      )
      .subscribe({
        next: (categorias) => this.categorias.set(categorias ?? []),
        error: () => this.categorias.set([])
      });
  }

  private buildFiltros(): FiltrosProductos {
    const value = this.filtrosForm.getRawValue();

    return {
      pageNumber: this.pageNumber(),
      pageSize: this.toPositiveNumber(value.pageSize, 25),
      categoria: this.normalizeText(value.categoria),
      codigoProducto: this.normalizeText(value.codigoProducto),
      codigoAlmacen: this.normalizeText(value.codigoAlmacen),
      estadoProducto: this.normalizeText(value.estadoProducto),
      linea: this.normalizeText(value.linea),
      proveedor: this.resolveProveedorCodigo(),
      fechaDesde: this.toApiDate(value.fechaDesde),
      fechaHasta: this.toApiDate(value.fechaHasta)
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
    const value = this.filtrosForm.getRawValue();
    const selected = this.normalizeText(value.proveedor);
    if (selected) {
      return selected;
    }

    const searchValue = this.normalizeText(value.proveedorSearch);
    const codigoFromDisplay = searchValue.match(/^([^-\/\s]+)\s*(?:-|\/)/)?.[1];

    return this.normalizeText(codigoFromDisplay || searchValue);
  }

  private isLikelyProveedorCodigo(value: string): boolean {
    const normalized = this.normalizeText(value);
    return normalized.length > 0 && normalized.length <= 20 && /[0-9]/.test(normalized) && /^[a-zA-Z0-9._-]+$/.test(normalized);
  }

  private toApiDate(value: string): string {
    const normalized = this.normalizeText(value);
    if (!normalized) {
      return '';
    }

    const [year, month, day] = normalized.split('-');
    if (year && month && day) {
      return `${day}/${month}/${year}`;
    }

    return normalized;
  }

  private getDefaultDateRange(): { fechaDesde: string; fechaHasta: string } {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

    return {
      fechaDesde: this.toInputDate(firstDay),
      fechaHasta: this.toInputDate(today)
    };
  }

  private toInputDate(value: Date): string {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private toPositiveNumber(value: number | string | null | undefined, fallback: number): number {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback;
  }

  private kpiNumber(value: number | null | undefined, fallback: number): number {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
  }

  private sum(items: ProductoAnalisis[], key: keyof ProductoAnalisis): number {
    return items.reduce((acc, item) => acc + (Number(item[key]) || 0), 0);
  }

  private marginTone(value: number): Tone {
    if (value < 10) {
      return 'danger';
    }
    if (value <= 25) {
      return 'warning';
    }
    return 'success';
  }

  private marginLabel(value: number): string {
    if (value < 10) {
      return 'Margen bajo';
    }
    if (value <= 25) {
      return 'Margen medio';
    }
    return 'Margen saludable';
  }

  private normalizeForCompare(value: string | null | undefined): string {
    return this.normalizeText(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase();
  }

  private normalizeText(value: string | null | undefined): string {
    return (value ?? '').trim();
  }
}
