import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, map, startWith, switchMap, tap } from 'rxjs/operators';
import { ProductoService } from 'src/app/demo/compras/producto-list/producto.service';
import { Producto } from 'src/app/demo/compras/producto-list/interfaces/Producto.interface';
import { ProveedorService, ProveedorUI } from 'src/app/demo/compras/proveedores/proveedor.service';
import { ErpKpiCardComponent } from 'src/app/theme/shared/components/erp-kpi-card/erp-kpi-card.component';
import { AlertaSeveridad, EstadoConsulta, ProductoSinMovimiento } from '../../interfaces/compras-reportes.interface';
import { ComprasReportesService } from '../../services/compras-reportes.service';
import { formatDateForApi, todayForDateInput } from '../../utils/compras-date.util';

interface AlertasResumen {
  total: number;
  alertas: number;
  sinVentas: number;
  unidades: number;
  maximoDias: number | null;
  productoMasCritico: ProductoSinMovimiento | null;
}

interface ResumenSeveridad {
  severidad: AlertaSeveridad;
  etiqueta: string;
  cantidad: number;
  tone: string;
}

type FiltroSeveridad = 'TODOS' | AlertaSeveridad;

@Component({
  selector: 'app-compras-inteligentes-alertas',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ErpKpiCardComponent],
  templateUrl: './compras-inteligentes-alertas.component.html',
  styleUrls: ['../compras-inteligentes-page.scss', './compras-inteligentes-alertas.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ComprasInteligentesAlertasComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly reportesService = inject(ComprasReportesService);
  private readonly proveedorService = inject(ProveedorService);
  private readonly productoService = inject(ProductoService);
  private readonly destroyRef = inject(DestroyRef);

  readonly form = this.fb.group({
    fechaCorte: this.fb.control(todayForDateInput(), Validators.required),
    diasAlerta: this.fb.control(45, [Validators.required, Validators.min(1), Validators.pattern(/^\d+$/)]),
    codProveedor: this.fb.control('', Validators.required),
    proveedorSearch: this.fb.control(''),
    codProducto: this.fb.control('')
  });

  readonly proveedores = signal<ProveedorUI[]>([]);
  readonly proveedorSeleccionado = signal<ProveedorUI | null>(null);
  readonly proveedoresLoading = signal(false);
  readonly proveedorMenuVisible = signal(false);
  readonly productos = signal<Producto[]>([]);
  readonly catalogosLoading = signal(false);
  readonly filas = signal<ProductoSinMovimiento[]>([]);
  readonly estado = signal<EstadoConsulta>('initial');
  readonly mensajeError = signal<string | null>(null);
  readonly submitted = signal(false);
  readonly busquedaLocal = signal('');
  readonly filtroSeveridad = signal<FiltroSeveridad>('TODOS');
  readonly detalleSeleccionado = signal<ProductoSinMovimiento | null>(null);

  readonly resumen = computed<AlertasResumen>(() => {
    const filas = this.filas();
    const productoMasCritico = filas
      .filter((fila) => fila.diasSinVenta !== null)
      .slice()
      .sort((a, b) => (b.diasSinVenta ?? -1) - (a.diasSinVenta ?? -1))[0] ?? null;
    return {
      total: filas.length,
      alertas: filas.filter((fila) => fila.estadoAlerta === 'ALERTA').length,
      sinVentas: filas.filter((fila) => fila.estadoAlerta === 'SIN VENTAS').length,
      unidades: filas.reduce((total, fila) => total + (Number(fila.existencia) || 0), 0),
      maximoDias: productoMasCritico?.diasSinVenta ?? null,
      productoMasCritico
    };
  });

  readonly resumenSeveridad = computed<ResumenSeveridad[]>(() => {
    const opciones: Omit<ResumenSeveridad, 'cantidad'>[] = [
      { severidad: 'MUY_CRITICA', etiqueta: 'Muy crítica', tone: 'danger' },
      { severidad: 'CRITICA', etiqueta: 'Crítica', tone: 'critical' },
      { severidad: 'ATENCION', etiqueta: 'Atención', tone: 'warning' },
      { severidad: 'RECIENTE', etiqueta: 'Reciente', tone: 'recent' },
      { severidad: 'SIN_HISTORIAL', etiqueta: 'Sin ventas', tone: 'muted' }
    ];
    return opciones.map((opcion) => ({
      ...opcion,
      cantidad: this.filas().filter((fila) => this.getSeverity(fila) === opcion.severidad).length
    }));
  });

  readonly productosSinVentas = computed(() => this.filas().filter((fila) => fila.estadoAlerta === 'SIN VENTAS'));
  readonly productosCriticos = computed(() => this.filas()
    .filter((fila) => fila.diasSinVenta !== null)
    .slice()
    .sort((a, b) => (b.diasSinVenta ?? -1) - (a.diasSinVenta ?? -1))
    .slice(0, 10));
  readonly maximoGrafico = computed(() => Math.max(...this.productosCriticos().map((fila) => fila.diasSinVenta ?? 0), 1));
  readonly filasFiltradas = computed(() => {
    const termino = this.busquedaLocal().trim().toLocaleLowerCase('es');
    const filtro = this.filtroSeveridad();
    return this.filas()
      .filter((fila) => filtro === 'TODOS' || this.getSeverity(fila) === filtro)
      .filter((fila) => !termino || fila.codProducto.toLocaleLowerCase('es').includes(termino) || fila.producto.toLocaleLowerCase('es').includes(termino))
      .slice()
      .sort((a, b) => {
        if (a.estadoAlerta !== b.estadoAlerta) return a.estadoAlerta === 'ALERTA' ? -1 : 1;
        return (b.diasExceso ?? -1) - (a.diasExceso ?? -1);
      });
  });

  ngOnInit(): void {
    this.catalogosLoading.set(true);
    this.productoService.getProductos({ pageNumber: 1, pageSize: 100 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => this.productos.set(response.datos ?? []),
        error: () => this.catalogosLoading.set(false),
        complete: () => this.catalogosLoading.set(false)
      });

    this.form.controls.proveedorSearch.valueChanges
      .pipe(
        startWith(''),
        tap(() => {
          this.form.controls.codProveedor.setValue('', { emitEvent: false });
          this.proveedorSeleccionado.set(null);
          this.proveedoresLoading.set(true);
        }),
        debounceTime(250),
        distinctUntilChanged(),
        switchMap((term) => this.buscarProveedores(term).pipe(catchError(() => of([])))),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((proveedores) => {
        this.proveedores.set(proveedores);
        this.proveedoresLoading.set(false);
      });
  }

  mostrarProveedores(): void { this.proveedorMenuVisible.set(true); }
  ocultarProveedores(): void { this.proveedorMenuVisible.set(false); }

  seleccionarProveedor(proveedor: ProveedorUI): void {
    this.proveedorSeleccionado.set(proveedor);
    this.form.patchValue({
      codProveedor: proveedor.codigo.trim(),
      proveedorSearch: `${proveedor.codigo.trim()} - ${proveedor.descripcion}`
    }, { emitEvent: false });
    this.proveedorMenuVisible.set(false);
  }

  buscar(): void {
    this.submitted.set(true);
    if (this.estado() === 'loading' || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    this.estado.set('loading');
    this.filas.set([]);
    this.mensajeError.set(null);
    this.detalleSeleccionado.set(null);
    this.reportesService.getProductosSinMovimiento({
      fechaCorte: formatDateForApi(value.fechaCorte),
      diasAlerta: Number(value.diasAlerta),
      codProveedor: value.codProveedor.trim(),
      codProducto: value.codProducto.trim() || undefined
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        const filas = response?.data ?? [];
        if (!response?.success && filas.length === 0) {
          this.mensajeError.set(response?.message || 'No fue posible evaluar las alertas.');
          this.estado.set('error');
          return;
        }
        this.filas.set(filas);
        this.estado.set(filas.length ? 'data' : 'empty');
      },
      error: (error: HttpErrorResponse) => this.handleError(error)
    });
  }

  getSeverity(fila: ProductoSinMovimiento): AlertaSeveridad {
    if (fila.estadoAlerta === 'SIN VENTAS' || fila.diasExceso === null) return 'SIN_HISTORIAL';
    if (fila.diasExceso <= 15) return 'RECIENTE';
    if (fila.diasExceso <= 45) return 'ATENCION';
    if (fila.diasExceso <= 90) return 'CRITICA';
    return 'MUY_CRITICA';
  }

  severityLabel(fila: ProductoSinMovimiento): string {
    const labels: Record<AlertaSeveridad, string> = {
      RECIENTE: 'RECIENTE', ATENCION: 'ATENCIÓN', CRITICA: 'CRÍTICA', MUY_CRITICA: 'MUY CRÍTICA', SIN_HISTORIAL: 'SIN HISTORIAL'
    };
    return labels[this.getSeverity(fila)];
  }

  severityClass(fila: ProductoSinMovimiento): string {
    const classes: Record<AlertaSeveridad, string> = {
      RECIENTE: 'recent', ATENCION: 'warning', CRITICA: 'critical', MUY_CRITICA: 'danger', SIN_HISTORIAL: 'muted'
    };
    return classes[this.getSeverity(fila)];
  }

  formatNumber(value: number | null | undefined): string {
    return value === null || value === undefined ? '—' : new Intl.NumberFormat('es-CR', { maximumFractionDigits: 2 }).format(Number(value));
  }

  formatDays(value: number | null | undefined): string {
    return value === null || value === undefined ? '—' : `${this.formatNumber(value)} días`;
  }

  formatExcess(value: number | null | undefined): string {
    return value === null || value === undefined ? '—' : `+${this.formatNumber(value)} días`;
  }

  formatDate(value: string | null | undefined): string {
    if (!value) return '—';
    const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    const slash = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(value);
    if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
    if (slash) return `${slash[1]}/${slash[2]}/${slash[3]}`;
    return value;
  }

  graficoWidth(value: number | null): string {
    return `${Math.max(3, ((value ?? 0) / this.maximoGrafico()) * 100)}%`;
  }

  diagnostico(fila: ProductoSinMovimiento): string {
    const existencia = `${this.formatNumber(fila.existencia)} ${fila.unidadMedida}`;
    if (fila.estadoAlerta === 'SIN VENTAS') {
      return `El producto mantiene ${existencia} en existencia, pero no se encontró una venta histórica que permita calcular sus días sin movimiento.`;
    }
    return `El producto mantiene ${existencia} en existencia y no registra una venta desde el ${this.formatDate(fila.fechaUltimaVenta)}. A la fecha de corte acumula ${this.formatNumber(fila.diasSinVenta)} días sin venta, superando en ${this.formatNumber(fila.diasExceso)} días el límite configurado de ${this.formatNumber(fila.diasAlerta)} días.`;
  }

  abrirDetalle(fila: ProductoSinMovimiento): void { this.detalleSeleccionado.set(fila); }
  cerrarDetalle(): void { this.detalleSeleccionado.set(null); }

  actualizarBusquedaLocal(event: Event): void {
    this.busquedaLocal.set((event.target as HTMLInputElement).value);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void { this.cerrarDetalle(); }

  private buscarProveedores(term: string): Observable<ProveedorUI[]> {
    const normalized = term.trim();
    if (normalized.length < 2) {
      return this.proveedorService.getProveedores(1, 25).pipe(map((response) => response.data ?? []));
    }
    const emptyResponse = { data: [] as ProveedorUI[], totalRegistros: 0, paginaActual: 1, pageSize: 25, totalPages: 1 };
    return forkJoin({
      porCodigo: this.proveedorService.getProveedores(1, 25, normalized, undefined).pipe(catchError(() => of(emptyResponse))),
      porDescripcion: this.proveedorService.getProveedores(1, 25, undefined, normalized).pipe(catchError(() => of(emptyResponse)))
    }).pipe(map(({ porCodigo, porDescripcion }) => {
      const unicos = new Map<string, ProveedorUI>();
      [...porCodigo.data, ...porDescripcion.data].forEach((proveedor) => unicos.set(proveedor.codigo, proveedor));
      return [...unicos.values()];
    }));
  }

  private handleError(error: HttpErrorResponse): void {
    this.filas.set([]);
    if (error.status === 404) {
      this.estado.set('empty');
      return;
    }
    this.mensajeError.set(error.status === 400
      ? this.safeBackendMessage(error) || 'No fue posible evaluar las alertas. Revise los parámetros seleccionados.'
      : 'No fue posible consultar los productos sin movimiento. Intente nuevamente.');
    this.estado.set('error');
  }

  private safeBackendMessage(error: HttpErrorResponse): string | null {
    if (!error.error || typeof error.error !== 'object') return null;
    const payload = error.error as Record<string, unknown>;
    const message = payload['message'] ?? payload['mensaje'] ?? payload['respuesta'];
    return typeof message === 'string' && message.length <= 240 ? message : null;
  }
}
