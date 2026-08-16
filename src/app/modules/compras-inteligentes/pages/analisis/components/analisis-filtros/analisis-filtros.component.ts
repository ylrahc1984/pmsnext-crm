import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, map, startWith, switchMap, tap } from 'rxjs/operators';
import { AlmacenService } from 'src/app/demo/compras/almacen/almacen.service';
import { Almacen } from 'src/app/demo/compras/almacen/interfaces/Almacen.interface';
import { ProductoService } from 'src/app/demo/compras/producto-list/producto.service';
import { Producto } from 'src/app/demo/compras/producto-list/interfaces/Producto.interface';
import { ProveedorService, ProveedorUI } from 'src/app/demo/compras/proveedores/proveedor.service';
import { ComprasAnalisisFiltros } from '../../../../interfaces/compras-reportes.interface';
import { monthStartForDateInput, todayForDateInput } from '../../../../utils/compras-date.util';

export type PerspectivaAnalisis = 'ventas' | 'compras' | 'rotacion';

@Component({
  selector: 'app-compras-analisis-filtros',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './analisis-filtros.component.html',
  styleUrls: ['./analisis-filtros.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AnalisisFiltrosComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly proveedorService = inject(ProveedorService);
  private readonly productoService = inject(ProductoService);
  private readonly almacenService = inject(AlmacenService);
  private readonly destroyRef = inject(DestroyRef);

  readonly perspectiva = input.required<PerspectivaAnalisis>();
  readonly loading = input(false);
  readonly consultar = output<ComprasAnalisisFiltros>();
  readonly proveedores = signal<ProveedorUI[]>([]);
  readonly productos = signal<Producto[]>([]);
  readonly almacenes = signal<Almacen[]>([]);
  readonly catalogosLoading = signal(false);
  readonly proveedoresLoading = signal(false);
  readonly proveedorMenuVisible = signal(false);
  readonly proveedorSeleccionado = signal<ProveedorUI | null>(null);
  readonly submitted = signal(false);

  readonly showWarehouse = computed(() => this.perspectiva() !== 'rotacion');
  readonly showHistoricalSupplier = computed(() => this.perspectiva() === 'ventas');

  readonly form = this.fb.group({
    fechaDesde: this.fb.control(monthStartForDateInput(), Validators.required),
    fechaHasta: this.fb.control(todayForDateInput(), Validators.required),
    codProveedor: this.fb.control('', Validators.required),
    proveedorSearch: this.fb.control(''),
    codProducto: this.fb.control(''),
    almacen: this.fb.control(''),
    proveedorHistorico: this.fb.control(false)
  });

  ngOnInit(): void {
    this.catalogosLoading.set(true);
    forkJoin({
      productos: this.productoService.getProductos({ pageNumber: 1, pageSize: 100 }),
      almacenes: this.almacenService.getAlmacenes()
    }).subscribe({
      next: ({ productos, almacenes }) => {
        this.productos.set(productos.datos ?? []);
        this.almacenes.set(almacenes);
      },
      complete: () => this.catalogosLoading.set(false),
      error: () => this.catalogosLoading.set(false)
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

  mostrarProveedores(): void {
    this.proveedorMenuVisible.set(true);
  }

  ocultarProveedores(): void {
    this.proveedorMenuVisible.set(false);
  }

  seleccionarProveedor(proveedor: ProveedorUI): void {
    this.proveedorSeleccionado.set(proveedor);
    this.form.patchValue({
      codProveedor: proveedor.codigo.trim(),
      proveedorSearch: `${proveedor.codigo.trim()} - ${proveedor.descripcion}`
    }, { emitEvent: false });
    this.proveedorMenuVisible.set(false);
  }

  enviar(): void {
    this.submitted.set(true);
    const value = this.form.getRawValue();
    if (this.loading() || this.form.invalid || value.fechaDesde > value.fechaHasta) {
      this.form.markAllAsTouched();
      return;
    }

    this.consultar.emit({
      fechaDesde: value.fechaDesde,
      fechaHasta: value.fechaHasta,
      codProveedor: value.codProveedor.trim(),
      proveedorNombre: this.proveedorSeleccionado()?.descripcion,
      codProducto: value.codProducto.trim() || undefined,
      almacen: value.almacen.trim() || undefined,
      proveedorHistorico: value.proveedorHistorico
    });
  }

  private buscarProveedores(term: string): Observable<ProveedorUI[]> {
    const normalized = term.trim();
    if (normalized.length < 2) {
      return this.proveedorService.getProveedores(1, 25).pipe(map((response) => response.data ?? []));
    }

    const emptyResponse = { data: [] as ProveedorUI[], totalRegistros: 0, paginaActual: 1, pageSize: 25, totalPages: 1 };
    return forkJoin({
      porCodigo: this.proveedorService.getProveedores(1, 25, normalized, undefined).pipe(catchError(() => of(emptyResponse))),
      porDescripcion: this.proveedorService.getProveedores(1, 25, undefined, normalized).pipe(catchError(() => of(emptyResponse)))
    }).pipe(
      map(({ porCodigo, porDescripcion }) => {
        const unicos = new Map<string, ProveedorUI>();
        [...porCodigo.data, ...porDescripcion.data].forEach((proveedor) => unicos.set(proveedor.codigo, proveedor));
        return [...unicos.values()];
      })
    );
  }
}
