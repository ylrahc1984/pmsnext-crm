import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, distinctUntilChanged, finalize, map, switchMap } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { ClienteListado } from 'src/app/demo/catalogos/agencias-comisionistas/cliente.models';
import { ClienteService } from 'src/app/demo/catalogos/agencias-comisionistas/cliente.service';
import { OrdenPedidoListadoItem } from 'src/app/demo/orden-pedido/interfaces/orden-pedido.interface';
import { OrdenPedidoService } from 'src/app/demo/orden-pedido/services/orden-pedido.service';
import { OPORTUNIDAD_ETAPAS, OportunidadFormValue, OportunidadUI } from './oportunidad.models';
import { OportunidadService } from './oportunidad.service';

type ClienteOption = { value: string; label: string };
type CotizacionOption = OrdenPedidoListadoItem & { id: string; label: string };
type SaveOutcome = { message: string; partial?: boolean };

@Component({
  selector: 'app-oportunidad-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './oportunidad-form.component.html',
  styleUrl: './oportunidad-form.component.scss'
})
export class OportunidadFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private destroyRef = inject(DestroyRef);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private oportunidadService = inject(OportunidadService);
  private clienteService = inject(ClienteService);
  private ordenPedidoService = inject(OrdenPedidoService);

  readonly etapas = OPORTUNIDAD_ETAPAS;

  isEditing = false;
  isLoading = false;
  isSaving = false;
  oportunidadId: number | null = null;
  clientesOptions: ClienteOption[] = [];
  loadedOportunidad: OportunidadUI | null = null;
  cotizacionesLoading = false;
  cotizacionesError = '';
  cotizacionesOptions: CotizacionOption[] = [];
  selectedCotizacion: CotizacionOption | null = null;
  clienteSearchTerm = '';
  clienteDropdownOpen = false;

  form = this.fb.group({
    codCliente: ['', [Validators.required]],
    titulo: ['', [Validators.required, Validators.maxLength(150)]],
    descripcion: ['', [Validators.maxLength(1000)]],
    montoEstimado: [0, [Validators.min(0)]],
    probabilidad: [50, [Validators.min(0), Validators.max(100)]],
    etapa: ['PROSPECTO', [Validators.required]],
    vendedor: [''],
    usarCotizacion: [false],
    cotizacionId: ['']
  });

  ngOnInit(): void {
    const routeId = this.route.snapshot.paramMap.get('id');
    this.oportunidadId = routeId ? Number(routeId) : null;
    this.isEditing = !!this.oportunidadId;
    if (this.isEditing) {
      this.form.get('codCliente')?.disable({ emitEvent: false });
    }

    this.setupCotizacionBehavior();

    const queryClient = (this.route.snapshot.queryParamMap.get('cliente') ?? '').trim();
    const queryClientName = (this.route.snapshot.queryParamMap.get('clienteNombre') ?? '').trim();

    this.isLoading = true;

    forkJoin({
      clientes: this.clienteService.getClientesListado(1, 100).pipe(
        catchError((error) => {
          console.error('Error al cargar clientes para oportunidades:', error);
          return of({
            data: [] as ClienteListado[],
            totalRegistros: 0,
            paginaActual: 1,
            pageSize: 100,
            totalPages: 1
          });
        })
      ),
      oportunidad: this.oportunidadId
        ? this.oportunidadService.getById(this.oportunidadId).pipe(
            catchError((error) => {
              console.error('Error al cargar oportunidad:', error);
              return of(null);
            })
          )
        : of(null)
    })
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe(({ clientes, oportunidad }) => {
        this.clientesOptions = clientes.data.map((cliente) => ({
          value: cliente.id,
          label: `${cliente.nombre} (${cliente.id})`
        }));

        if (queryClient) {
          this.ensureClienteOption(queryClient, queryClientName || queryClient);
          this.form.patchValue({ codCliente: queryClient });
          this.syncClienteSearchTerm();
        }

        if (oportunidad) {
          this.loadedOportunidad = oportunidad;
          this.ensureClienteOption(oportunidad.codCliente, oportunidad.clienteNombre || oportunidad.codCliente);
          this.form.patchValue({
            codCliente: oportunidad.codCliente,
            titulo: oportunidad.titulo,
            descripcion: oportunidad.descripcion,
            montoEstimado: oportunidad.montoEstimado,
            probabilidad: oportunidad.probabilidad,
            etapa: oportunidad.etapa,
            vendedor: oportunidad.vendedor
          });

          if (oportunidad.tieneCotizacion) {
            const selected = this.createCotizacionOptionFromOportunidad(oportunidad);
            this.selectedCotizacion = selected;
            this.cotizacionesOptions = [selected];
            this.form.patchValue(
              {
                usarCotizacion: true,
                cotizacionId: selected.id
              },
              { emitEvent: false }
            );
          }
        }

        this.syncCotizacionValidation();
        this.syncLockedFields();
        this.syncClienteSearchTerm();
      });
  }

  get pageTitle(): string {
    return this.isEditing ? 'Editar oportunidad' : 'Nueva oportunidad';
  }

  get selectedClienteLabel(): string {
    const value = this.form.get('codCliente')?.value ?? '';
    return this.clientesOptions.find((item) => item.value === value)?.label || 'Sin cliente seleccionado';
  }

  get clienteFieldLocked(): boolean {
    return this.isEditing || !!this.selectedCotizacion;
  }

  get filteredClientesOptions(): ClienteOption[] {
    const term = this.clienteSearchTerm.trim().toLowerCase();
    const items = !term
      ? this.clientesOptions
      : this.clientesOptions.filter(
          (item) => item.label.toLowerCase().includes(term) || item.value.toLowerCase().includes(term)
        );

    return items.slice(0, 8);
  }

  get showCreateClienteHint(): boolean {
    return !this.clienteFieldLocked && !!this.clienteSearchTerm.trim() && !this.filteredClientesOptions.length;
  }

  get cotizacionActiva(): boolean {
    return !!this.form.get('usarCotizacion')?.value;
  }

  get cotizacionSeleccionadaLabel(): string {
    return this.selectedCotizacion?.label || 'Sin cotización seleccionada';
  }

  get cotizacionEstadoLabel(): string {
    return this.selectedCotizacion ? 'Seleccionada' : 'Pendiente';
  }

  get origenLabel(): string {
    return this.selectedCotizacion ? 'Cotización' : 'Manual';
  }

  save(): void {
    this.syncCotizacionValidation();
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    const payload: OportunidadFormValue = {
      codCliente: this.form.get('codCliente')?.value ?? '',
      titulo: this.form.get('titulo')?.value ?? '',
      descripcion: this.form.get('descripcion')?.value ?? '',
      montoEstimado: Number(this.form.get('montoEstimado')?.value ?? 0),
      probabilidad: Number(this.form.get('probabilidad')?.value ?? 0),
      etapa: (this.form.get('etapa')?.value as OportunidadFormValue['etapa']) ?? 'PROSPECTO',
      vendedor: this.form.get('vendedor')?.value ?? '',
      cotizacionId: this.form.get('cotizacionId')?.value ?? ''
    };

    const request$ =
      this.isEditing && this.oportunidadId ? this.oportunidadService.update(this.oportunidadId, payload) : this.oportunidadService.create(payload);

    request$
      .pipe(
        switchMap((response) => {
          const shouldSyncStage =
            !!this.isEditing &&
            !!this.oportunidadId &&
            !!this.loadedOportunidad &&
            this.loadedOportunidad.etapa !== payload.etapa;

          if (!shouldSyncStage || !this.oportunidadId) {
            return of(response);
          }

          return this.oportunidadService.changeStage(this.oportunidadId, payload.etapa).pipe(switchMap(() => of(response)));
        }),
        switchMap((response) => this.syncCotizacionAfterSave(payload).pipe(map((result) => ({
          message: result?.message || response?.mensaje || 'La operación se completó correctamente.',
          partial: result?.partial
        })))),
        finalize(() => (this.isSaving = false))
      )
      .subscribe({
        next: async (result: SaveOutcome) => {
          await Swal.fire({
            title: result.partial ? 'Oportunidad guardada con aviso' : this.isEditing ? 'Oportunidad actualizada' : 'Oportunidad creada',
            text: result.message,
            icon: result.partial ? 'warning' : 'success',
            timer: result.partial ? undefined : 1800,
            showConfirmButton: !!result.partial
          });
          this.router.navigate(['/crm/oportunidades']);
        },
        error: async (error) => {
          console.error('Error al guardar oportunidad:', error);
          await Swal.fire({
            title: 'Error',
            text: 'No se pudo guardar la oportunidad.',
            icon: 'error'
          });
        }
      });
  }

  cancel(): void {
    this.router.navigate(['/crm/oportunidades']);
  }

  onClienteSearchInput(value: string): void {
    this.clienteSearchTerm = value;

    if (this.clienteFieldLocked) {
      return;
    }

    this.clienteDropdownOpen = true;

    if (!value.trim() || value.trim() !== this.selectedClienteLabel) {
      this.form.patchValue({ codCliente: '' }, { emitEvent: false });
    }
  }

  openClienteDropdown(): void {
    if (this.clienteFieldLocked) {
      return;
    }

    this.clienteDropdownOpen = true;
  }

  closeClienteDropdown(): void {
    setTimeout(() => {
      this.clienteDropdownOpen = false;
      if (!this.form.get('codCliente')?.value && !this.clienteFieldLocked) {
        this.clienteSearchTerm = '';
      }
    }, 120);
  }

  selectCliente(option: ClienteOption): void {
    if (this.clienteFieldLocked) {
      return;
    }

    this.ensureClienteOption(option.value, option.label);
    this.clienteSearchTerm = option.label;
    this.form.patchValue({ codCliente: option.value }, { emitEvent: true });
    this.clienteDropdownOpen = false;
  }

  openNuevoCliente(): void {
    this.router.navigate(['/catalogos/clientes/nuevo']);
  }

  openNuevaCotizacion(): void {
    this.router.navigate(['/demo/ordenes-pedido/nuevo']);
  }

  onCotizacionSelected(cotizacionId: string): void {
    const selected = this.cotizacionesOptions.find((item) => item.id === cotizacionId) || null;
    this.selectedCotizacion = selected;

    if (!selected) {
      this.syncLockedFields();
      return;
    }

    this.form.patchValue(
      {
        cotizacionId: selected.id,
        montoEstimado: selected.total || 0,
        descripcion: selected.observaciones || this.form.get('descripcion')?.value || '',
        vendedor: this.form.get('vendedor')?.value || selected.operador || ''
      },
      { emitEvent: false }
    );

    this.syncLockedFields();
  }

  private ensureClienteOption(value: string, label: string): void {
    if (!value || this.clientesOptions.some((item) => item.value === value)) {
      return;
    }
    this.clientesOptions = [{ value, label: `${label} (${value})` }, ...this.clientesOptions];
  }

  private setupCotizacionBehavior(): void {
    this.form
      .get('codCliente')
      ?.valueChanges.pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.syncClienteSearchTerm();
      });

    this.form
      .get('usarCotizacion')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((enabled) => {
        const isEnabled = !!enabled;

        if (!isEnabled) {
          this.cotizacionesError = '';
          this.cotizacionesOptions = [];
          this.selectedCotizacion = null;
          this.form.patchValue({ cotizacionId: '' }, { emitEvent: false });
          this.syncCotizacionValidation();
          this.syncLockedFields();
          return;
        }

        this.syncCotizacionValidation();
        this.loadCotizacionesForSelectedCliente();
      });

    this.form
      .get('codCliente')
      ?.valueChanges.pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (!this.cotizacionActiva) {
          return;
        }

        this.selectedCotizacion = null;
        this.form.patchValue({ cotizacionId: '' }, { emitEvent: false });
        this.loadCotizacionesForSelectedCliente();
      });
  }

  private loadCotizacionesForSelectedCliente(): void {
    const codCliente = (this.form.get('codCliente')?.value ?? '').trim();

    if (!codCliente) {
      this.cotizacionesOptions = this.selectedCotizacion ? [this.selectedCotizacion] : [];
      this.cotizacionesError = 'Seleccione un cliente para consultar sus cotizaciones.';
      this.syncLockedFields();
      return;
    }

    this.cotizacionesLoading = true;
    this.cotizacionesError = '';

    this.ordenPedidoService
      .getOrdenes({
        tipOrden: 'COT',
        fechaDesde: `01/01/${new Date().getFullYear()}`,
        fechaHasta: this.getTodayForApi(),
        nomCliente: this.getClienteSearchName(),
        pageNumber: 1,
        pageSize: 50
      })
      .pipe(finalize(() => (this.cotizacionesLoading = false)))
      .subscribe({
        next: (response) => {
          const items = response.datos.map((item) => this.mapCotizacionOption(item));
          this.cotizacionesOptions = this.mergeCotizaciones(items);
          this.cotizacionesError = items.length ? '' : 'No se encontraron cotizaciones para el cliente seleccionado.';
          this.syncLockedFields();
        },
        error: (error) => {
          console.error('Error al cargar cotizaciones para oportunidad:', error);
          this.cotizacionesOptions = this.selectedCotizacion ? [this.selectedCotizacion] : [];
          this.cotizacionesError = 'No se pudieron cargar las cotizaciones del cliente.';
          this.syncLockedFields();
        }
      });
  }

  private syncCotizacionValidation(): void {
    const cotizacionControl = this.form.get('cotizacionId');
    if (!cotizacionControl) {
      return;
    }

    if (this.cotizacionActiva) {
      cotizacionControl.setValidators([Validators.required]);
    } else {
      cotizacionControl.clearValidators();
    }

    cotizacionControl.updateValueAndValidity({ emitEvent: false });
  }

  private syncLockedFields(): void {
    const codClienteControl = this.form.get('codCliente');
    const montoControl = this.form.get('montoEstimado');
    const lockCliente = this.isEditing || !!this.selectedCotizacion;
    const lockMonto = !!this.selectedCotizacion;

    if (lockCliente) {
      codClienteControl?.disable({ emitEvent: false });
    } else {
      codClienteControl?.enable({ emitEvent: false });
    }

    if (lockMonto) {
      montoControl?.disable({ emitEvent: false });
    } else {
      montoControl?.enable({ emitEvent: false });
    }
  }

  private syncClienteSearchTerm(): void {
    const value = this.form.get('codCliente')?.value ?? '';
    if (!value) {
      if (!this.clienteDropdownOpen) {
        this.clienteSearchTerm = '';
      }
      return;
    }

    const option = this.clientesOptions.find((item) => item.value === value);
    if (option) {
      this.clienteSearchTerm = option.label;
    }
  }

  private syncCotizacionAfterSave(payload: OportunidadFormValue): Observable<SaveOutcome | null> {
    if (!this.selectedCotizacion) {
      return of<SaveOutcome | null>(null);
    }

    const cotizacionPayload = {
      tipNDP: (this.selectedCotizacion.tipOrden || 'COT').trim().toUpperCase(),
      serieNDP: (this.selectedCotizacion.serie || '').trim(),
      numNDP: (this.selectedCotizacion.numero || '').trim()
    };

    if (this.isEditing && this.oportunidadId) {
      return this.oportunidadService.vincularCotizacion(this.oportunidadId, cotizacionPayload).pipe(
        map((response) => ({
          message: response?.mensaje || 'La oportunidad se actualizó y la cotización quedó asociada.'
        }))
      );
    }

    return this.oportunidadService.getByCliente(payload.codCliente, 'A').pipe(
      map((items) =>
        [...items]
          .filter((item) => item.codCliente === payload.codCliente && item.titulo.trim().toLowerCase() === payload.titulo.trim().toLowerCase())
          .sort((left, right) => right.id - left.id)[0] || null
      ),
      switchMap((created) => {
        if (!created?.id) {
          return of<SaveOutcome>({
            partial: true,
            message: 'La oportunidad se creó, pero no se pudo identificar automáticamente para asociar la cotización.'
          });
        }

        return this.oportunidadService.vincularCotizacion(created.id, cotizacionPayload).pipe(
          map((response) => ({
            message: response?.mensaje || 'La oportunidad se creó y la cotización quedó asociada.'
          })),
          catchError((error) => {
            console.error('Error al vincular cotización luego de crear oportunidad:', error);
            return of<SaveOutcome>({
              partial: true,
              message: 'La oportunidad se creó, pero la vinculación de la cotización quedó pendiente.'
            });
          })
        );
      })
    );
  }

  private createCotizacionOptionFromOportunidad(oportunidad: OportunidadUI): CotizacionOption {
    const id = [oportunidad.tipNDP, oportunidad.serieNDP, oportunidad.numNDP].filter(Boolean).join('|');
    const total = Number(oportunidad.montoEstimado || 0);
    return {
      id,
      label: `${oportunidad.tipNDP || 'COT'} ${oportunidad.serieNDP || '---'} - ${oportunidad.numNDP || '---'} - ${oportunidad.clienteNombre || oportunidad.codCliente} - CRC ${this.formatAmount(total)}`,
      tipOrden: oportunidad.tipNDP || 'COT',
      serie: oportunidad.serieNDP || '',
      numero: oportunidad.numNDP || '',
      fecha: '',
      cliente: oportunidad.clienteNombre || oportunidad.codCliente,
      ruc: '',
      items: 0,
      subtotal: total,
      impuesto: 0,
      total,
      estado: oportunidad.estado,
      observaciones: oportunidad.descripcion || '',
      operador: oportunidad.vendedor || ''
    };
  }

  private mapCotizacionOption(item: OrdenPedidoListadoItem): CotizacionOption {
    return {
      ...item,
      id: [item.tipOrden, item.serie, item.numero].filter(Boolean).join('|'),
      label: `${item.tipOrden} ${item.serie} - ${item.numero} - ${item.cliente || 'Cliente'} - CRC ${this.formatAmount(item.total)}`
    };
  }

  private mergeCotizaciones(items: CotizacionOption[]): CotizacionOption[] {
    const mapById = new Map<string, CotizacionOption>();

    for (const item of [this.selectedCotizacion, ...items].filter((value): value is CotizacionOption => !!value)) {
      mapById.set(item.id, item);
    }

    return Array.from(mapById.values());
  }

  private getClienteSearchName(): string {
    const selected = this.selectedClienteLabel;
    return selected.replace(/\s*\([^)]*\)\s*$/, '').trim();
  }

  private getTodayForApi(): string {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    return `${day}/${month}/${year}`;
  }

  formatAmount(value: number): string {
    return new Intl.NumberFormat('es-CR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(value || 0);
  }
}
