import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable, Subscription, forkJoin, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, finalize, map, startWith, switchMap, tap } from 'rxjs/operators';
import { AlmacenService } from 'src/app/demo/compras/almacen/almacen.service';
import { Almacen } from 'src/app/demo/compras/almacen/interfaces/Almacen.interface';
import { ProveedorService, ProveedorUI } from 'src/app/demo/compras/proveedores/proveedor.service';
import {
  InventarioHistoricoPaginacion,
  InventarioHistoricoRegistro,
  InventarioHistoricoResumen,
  InventarioHistoricoStockFilter
} from '../../interfaces/inventario-historico.interface';
import { ComprasReportesService } from '../../services/compras-reportes.service';
import { formatDateForApi, monthStartForDateInput, todayForDateInput } from '../../utils/compras-date.util';

type EstadoInventarioConsulta = 'initial' | 'loading' | 'data' | 'empty' | 'error';
type VariacionTone = 'positive' | 'negative' | 'neutral';

const EMPTY_PAGINATION: InventarioHistoricoPaginacion = {
  pageNumber: 1,
  pageSize: 20,
  totalRows: 0,
  totalPages: 0
};

const EMPTY_SUMMARY: InventarioHistoricoResumen = {
  totalRegistrosFiltrados: 0,
  sumStockInicialPeriodo: 0,
  sumStockFinalPeriodo: 0,
  sumMovimientoPeriodo: 0,
  valorInventarioInicialTotal: 0,
  valorInventarioFinalTotal: 0,
  countStockPositivo: 0,
  countStockNegativo: 0,
  countStockCero: 0
};

@Component({
  selector: 'app-compras-inventario',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './compras-inventario.component.html',
  styleUrls: ['../compras-inteligentes-page.scss', './compras-inventario.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ComprasInventarioComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly reportesService = inject(ComprasReportesService);
  private readonly almacenService = inject(AlmacenService);
  private readonly proveedorService = inject(ProveedorService);
  private readonly destroyRef = inject(DestroyRef);
  private consultaSubscription: Subscription | null = null;

  readonly form = this.fb.group({
    fechaDesde: this.fb.control(monthStartForDateInput(), Validators.required),
    fechaHasta: this.fb.control(todayForDateInput(), Validators.required),
    codAlmacen: this.fb.control('', Validators.required),
    codProveedor: this.fb.control(''),
    proveedorSearch: this.fb.control(''),
    stockFilter: this.fb.control<InventarioHistoricoStockFilter>(0),
    stockTolerance: this.fb.control(0.0001, [Validators.required, Validators.min(0)])
  });

  readonly almacenes = signal<Almacen[]>([]);
  readonly proveedores = signal<ProveedorUI[]>([]);
  readonly proveedorSeleccionado = signal<ProveedorUI | null>(null);
  readonly proveedorMenuVisible = signal(false);
  readonly catalogosLoading = signal(false);
  readonly proveedoresLoading = signal(false);
  readonly submitted = signal(false);
  readonly estado = signal<EstadoInventarioConsulta>('initial');
  readonly filas = signal<InventarioHistoricoRegistro[]>([]);
  readonly paginacion = signal<InventarioHistoricoPaginacion>(EMPTY_PAGINATION);
  readonly resumen = signal<InventarioHistoricoResumen>(EMPTY_SUMMARY);
  readonly detalleExpandido = signal<string | null>(null);
  readonly mensajeError = signal<string | null>(null);
  readonly filtrosAplicados = signal<{ periodo: string; almacen: string; proveedor: string; stock: string } | null>(null);
  readonly pageSizes = [20, 50, 100] as const;
  readonly stockFilterOptions: ReadonlyArray<{ value: InventarioHistoricoStockFilter; label: string }> = [
    { value: 0, label: 'Todos los estados' },
    { value: 1, label: 'Stock positivo' },
    { value: 2, label: 'Stock negativo' },
    { value: 3, label: 'Stock en cero' }
  ];

  readonly desdeRegistro = computed(() => {
    const page = this.paginacion();
    return page.totalRows ? (page.pageNumber - 1) * page.pageSize + 1 : 0;
  });
  readonly hastaRegistro = computed(() => {
    const page = this.paginacion();
    return Math.min(page.pageNumber * page.pageSize, page.totalRows);
  });
  readonly paginasVisibles = computed(() => {
    const { pageNumber, totalPages } = this.paginacion();
    if (totalPages <= 1) return totalPages === 1 ? [1] : [];
    const desde = Math.max(1, Math.min(pageNumber - 2, totalPages - 4));
    const hasta = Math.min(totalPages, desde + 4);
    return Array.from({ length: hasta - desde + 1 }, (_, index) => desde + index);
  });

  ngOnInit(): void {
    this.cargarCatalogos();
    this.configurarBusquedaProveedor();
  }

  consultar(): void {
    this.submitted.set(true);
    const value = this.form.getRawValue();
    const proveedorValido = !value.proveedorSearch.trim() || Boolean(value.codProveedor.trim());
    if (this.estado() === 'loading' || this.form.invalid || value.fechaDesde > value.fechaHasta || !proveedorValido) {
      this.form.markAllAsTouched();
      return;
    }
    this.ejecutarConsulta(1, this.paginacion().pageSize || 20);
  }

  cambiarPagina(pageNumber: number): void {
    const page = this.paginacion();
    if (this.estado() === 'loading' || pageNumber < 1 || pageNumber > page.totalPages || pageNumber === page.pageNumber) return;
    this.ejecutarConsulta(pageNumber, page.pageSize);
  }

  cambiarTamanoPagina(event: Event): void {
    const pageSize = Number((event.target as HTMLSelectElement).value);
    if (!this.pageSizes.includes(pageSize as (typeof this.pageSizes)[number])) return;
    this.ejecutarConsulta(1, pageSize);
  }

  mostrarProveedores(): void {
    this.proveedorMenuVisible.set(true);
  }

  ocultarProveedores(): void {
    this.proveedorMenuVisible.set(false);
  }

  seleccionarProveedor(proveedor: ProveedorUI): void {
    this.proveedorSeleccionado.set(proveedor);
    this.form.patchValue(
      {
        codProveedor: proveedor.codigo.trim(),
        proveedorSearch: `${proveedor.codigo.trim()} - ${proveedor.descripcion}`
      },
      { emitEvent: false }
    );
    this.proveedorMenuVisible.set(false);
  }

  limpiarProveedor(): void {
    this.proveedorSeleccionado.set(null);
    this.form.patchValue({ codProveedor: '', proveedorSearch: '' });
    this.proveedores.set([]);
  }

  alternarDetalle(fila: InventarioHistoricoRegistro): void {
    const key = this.rowKey(fila);
    this.detalleExpandido.update((actual) => (actual === key ? null : key));
  }

  detalleVisible(fila: InventarioHistoricoRegistro): boolean {
    return this.detalleExpandido() === this.rowKey(fila);
  }

  totalEntradas(fila: InventarioHistoricoRegistro): number {
    return this.sum(fila.comprasPeriodo, fila.ncVentasPeriodo, fila.entradasPeriodo, fila.ajustesPositivosPeriodo);
  }

  totalSalidas(fila: InventarioHistoricoRegistro): number {
    return this.sum(fila.ncComprasPeriodo, fila.ventasPeriodo, fila.salidasPeriodo, fila.produccionPeriodo, fila.ajustesNegativosPeriodo);
  }

  formatNumber(value: number | null | undefined): string {
    return new Intl.NumberFormat('es-CR', { maximumFractionDigits: 2 }).format(Number(value) || 0);
  }

  formatSignedNumber(value: number | null | undefined): string {
    const numeric = Number(value) || 0;
    return `${numeric > 0 ? '+' : ''}${this.formatNumber(numeric)}`;
  }

  formatCurrency(value: number | null | undefined, signed = false): string {
    const numeric = Number(value) || 0;
    const formatted = new Intl.NumberFormat('es-CR', {
      style: 'currency',
      currency: 'CRC',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(Math.abs(numeric));
    if (!signed || numeric === 0) return numeric < 0 ? `-${formatted}` : formatted;
    return `${numeric > 0 ? '+' : '-'}${formatted}`;
  }

  formatDate(value: string | null | undefined): string {
    if (!value) return '—';
    const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    return iso ? `${iso[3]}/${iso[2]}/${iso[1]}` : value;
  }

  variacionTone(value: number): VariacionTone {
    return value > 0 ? 'positive' : value < 0 ? 'negative' : 'neutral';
  }

  rowKey(fila: InventarioHistoricoRegistro): string {
    return `${fila.codAlmacen}-${fila.codProducto}`;
  }

  private cargarCatalogos(): void {
    this.catalogosLoading.set(true);
    forkJoin({ almacenes: this.almacenService.getAlmacenes() })
      .pipe(
        finalize(() => this.catalogosLoading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: ({ almacenes }) => {
          this.almacenes.set(almacenes);
          const principal = almacenes.find((item) => Number(item.CAC05_Principal) === 1) ?? almacenes[0];
          if (principal && !this.form.controls.codAlmacen.value) {
            this.form.controls.codAlmacen.setValue(principal.CAC05_CodAlmacen);
          }
        },
        error: () => {
          this.mensajeError.set('No fue posible cargar los almacenes disponibles.');
          this.estado.set('error');
        }
      });
  }

  private configurarBusquedaProveedor(): void {
    this.form.controls.proveedorSearch.valueChanges
      .pipe(
        startWith(''),
        tap((term) => {
          if (!term.trim()) this.proveedorSeleccionado.set(null);
          this.form.controls.codProveedor.setValue('', { emitEvent: false });
          this.proveedoresLoading.set(Boolean(term.trim()));
        }),
        debounceTime(250),
        distinctUntilChanged(),
        switchMap((term) => (term.trim().length < 2 ? of([]) : this.buscarProveedores(term).pipe(catchError(() => of([]))))),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((proveedores) => {
        this.proveedores.set(proveedores);
        this.proveedoresLoading.set(false);
      });
  }

  private buscarProveedores(term: string): Observable<ProveedorUI[]> {
    const normalized = term.trim();
    const emptyResponse = { data: [] as ProveedorUI[], totalRegistros: 0, paginaActual: 1, pageSize: 20, totalPages: 1 };
    return forkJoin({
      porCodigo: this.proveedorService.getProveedores(1, 20, normalized, undefined).pipe(catchError(() => of(emptyResponse))),
      porDescripcion: this.proveedorService.getProveedores(1, 20, undefined, normalized).pipe(catchError(() => of(emptyResponse)))
    }).pipe(
      map(({ porCodigo, porDescripcion }) => {
        const unicos = new Map<string, ProveedorUI>();
        [...porCodigo.data, ...porDescripcion.data].forEach((proveedor) => unicos.set(proveedor.codigo, proveedor));
        return [...unicos.values()];
      })
    );
  }

  private ejecutarConsulta(pageNumber: number, pageSize: number): void {
    const value = this.form.getRawValue();
    this.consultaSubscription?.unsubscribe();
    this.estado.set('loading');
    this.mensajeError.set(null);
    this.detalleExpandido.set(null);

    this.consultaSubscription = this.reportesService
      .getInventarioHistorico({
        fechaDesde: formatDateForApi(value.fechaDesde),
        fechaHasta: formatDateForApi(value.fechaHasta),
        codAlmacen: value.codAlmacen.trim(),
        codProveedor: value.codProveedor.trim() || undefined,
        pageNumber,
        pageSize,
        stockFilter: value.stockFilter,
        stockTolerance: value.stockTolerance
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const filas = response?.datos ?? [];
          const paginacion = response?.paginacion ?? { ...EMPTY_PAGINATION, pageNumber, pageSize };
          this.filas.set(filas);
          this.paginacion.set({
            pageNumber: Number(paginacion.pageNumber) || pageNumber,
            pageSize: Number(paginacion.pageSize) || pageSize,
            totalRows: Number(paginacion.totalRows) || 0,
            totalPages: Number(paginacion.totalPages) || 0
          });
          this.resumen.set(response?.resumen ?? EMPTY_SUMMARY);
          this.filtrosAplicados.set({
            periodo: `${this.formatDate(value.fechaDesde)} – ${this.formatDate(value.fechaHasta)}`,
            almacen: this.almacenes().find((item) => item.CAC05_CodAlmacen === value.codAlmacen)?.CAC05_NomAlmacen ?? value.codAlmacen,
            proveedor: this.proveedorSeleccionado()?.descripcion ?? 'Todos los proveedores',
            stock: this.stockFilterOptions.find((option) => option.value === value.stockFilter)?.label ?? 'Todos los estados'
          });
          this.estado.set(filas.length ? 'data' : 'empty');
        },
        error: (error: HttpErrorResponse) => this.handleError(error)
      });
  }

  private handleError(error: HttpErrorResponse): void {
    this.filas.set([]);
    this.paginacion.set(EMPTY_PAGINATION);
    this.resumen.set(EMPTY_SUMMARY);
    if (error.status === 404) {
      this.estado.set('empty');
      return;
    }
    this.mensajeError.set(
      error.status === 400
        ? this.safeBackendMessage(error) || 'Revise las fechas, el almacén y el proveedor seleccionados.'
        : 'No fue posible consultar el inventario histórico. Intente nuevamente.'
    );
    this.estado.set('error');
  }

  private safeBackendMessage(error: HttpErrorResponse): string | null {
    if (!error.error || typeof error.error !== 'object') return null;
    const payload = error.error as Record<string, unknown>;
    const message = payload['message'] ?? payload['mensaje'] ?? payload['respuesta'];
    return typeof message === 'string' && message.length <= 240 ? message : null;
  }

  private sum(...values: number[]): number {
    return values.reduce((total, value) => total + (Number(value) || 0), 0);
  }
}
