import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subject, forkJoin, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, finalize, switchMap } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { ClienteListado, ClienteUI } from 'src/app/demo/catalogos/agencias-comisionistas/cliente.models';
import { ClienteService } from 'src/app/demo/catalogos/agencias-comisionistas/cliente.service';
import {
  OPORTUNIDAD_ETAPAS,
  OPORTUNIDAD_ORIGENES,
  OPORTUNIDAD_PRIORIDADES,
  OPORTUNIDAD_TIPOS_CLIENTE,
  OportunidadFormValue,
  OportunidadUI
} from './oportunidad.models';
import { OportunidadService } from './oportunidad.service';
import { OrdenPedidoReturnInfo } from 'src/app/demo/orden-pedido/interfaces/orden-pedido-return.interface';

type ClienteOption = { value: string; name: string; label: string };
type SaveOutcome = { message: string; partial?: boolean };
type OportunidadNavigationDraft = {
  form: {
    codCliente: string;
    titulo: string;
    descripcion: string;
    montoEstimado: number;
    probabilidad: number;
    etapa: string;
    vendedor: string;
    fechaCierreEstimada: string;
    origen: string;
    prioridad: string;
    tipoCliente: string;
    tipNDP: string;
    serieNDP: string;
    numNDP: string;
  };
  clienteSearchTerm: string;
};

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

  readonly etapas = OPORTUNIDAD_ETAPAS;
  readonly prioridades = OPORTUNIDAD_PRIORIDADES;
  readonly origenes = OPORTUNIDAD_ORIGENES;
  readonly tiposCliente = OPORTUNIDAD_TIPOS_CLIENTE;

  isEditing = false;
  isLoading = false;
  isSaving = false;
  oportunidadId: number | null = null;
  clientesOptions: ClienteOption[] = [];
  loadedOportunidad: OportunidadUI | null = null;
  clienteSearchTerm = '';
  clienteDropdownOpen = false;
  clienteSearchLoading = false;
  private clienteSuggestions: ClienteOption[] = [];
  private clienteSearchInput$ = new Subject<string>();
  private pendingOrderResultFromNavigation: OrdenPedidoReturnInfo | null = null;
  private pendingDraftFromNavigation: OportunidadNavigationDraft | null = null;
  private shouldCleanReturnState = false;

  form = this.fb.group({
    codCliente: ['', [Validators.required]],
    titulo: ['', [Validators.required, Validators.maxLength(150)]],
    descripcion: ['', [Validators.maxLength(1000)]],
    montoEstimado: [0, [Validators.min(0)]],
    probabilidad: [50, [Validators.min(0), Validators.max(100)]],
    etapa: ['PROSPECTO', [Validators.required]],
    vendedor: [''],
    fechaCierreEstimada: [''],
    origen: [this.origenes[0] as string],
    prioridad: [this.prioridades[1] as string],
    tipoCliente: [this.tiposCliente[0] as string],
    tipNDP: [''],
    serieNDP: [''],
    numNDP: ['']
  });

  ngOnInit(): void {
    this.restoreOrderResultFromNavigation();
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
          name: cliente.nombre,
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
            vendedor: oportunidad.vendedor,
            fechaCierreEstimada: this.toInputDate(oportunidad.fechaCierreEstimada),
            origen: this.resolveOrigenValue(oportunidad.origen),
            prioridad: this.resolvePrioridadValue(oportunidad.prioridad),
            tipoCliente: this.resolveTipoClienteValue(oportunidad.tipoCliente),
            tipNDP: oportunidad.tipNDP,
            serieNDP: oportunidad.serieNDP,
            numNDP: oportunidad.numNDP
          });
        } else if (!this.isEditing) {
          // Para nuevas oportunidades, establecer fecha de cierre estimada con tiempo prudencial (30 días)
          const defaultClosingDate = this.getDefaultClosingDate();
          this.form.patchValue({
            fechaCierreEstimada: defaultClosingDate
          });
        }

        this.applyNavigationReturnState();

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

  get selectedClienteNombre(): string {
    const value = this.form.get('codCliente')?.value ?? '';
    const option = this.clientesOptions.find((item) => item.value === value);
    if (option?.name) {
      return option.name;
    }
    return this.extractClienteNombre(this.clienteSearchTerm, value) || value;
  }

  get clienteFieldLocked(): boolean {
    return this.isEditing || this.hasCotizacionAsociada;
  }

  get filteredClientesOptions(): ClienteOption[] {
    const term = this.clienteSearchTerm.trim().toLowerCase();
    const baseItems = term ? this.clienteSuggestions : this.clientesOptions;
    const items = !term
      ? baseItems
      : baseItems.filter((item) => item.label.toLowerCase().includes(term) || item.value.toLowerCase().includes(term));

    return items.slice(0, 8);
  }

  get showCreateClienteHint(): boolean {
    return !this.clienteFieldLocked && !this.clienteSearchLoading && !!this.clienteSearchTerm.trim() && !this.filteredClientesOptions.length;
  }

  get hasCotizacionAsociada(): boolean {
    const { tipNDP, serieNDP, numNDP } = this.getCotizacionData();
    return !!tipNDP || !!serieNDP || !!numNDP;
  }

  get hasCotizacionVinculada(): boolean {
    const { tipNDP, serieNDP, numNDP } = this.getCotizacionData();
    return !!tipNDP && !!serieNDP && !!numNDP;
  }

  get cotizacionSeleccionadaLabel(): string {
    if (!this.hasCotizacionAsociada) {
      return 'Sin cotización';
    }

    const { tipNDP, serieNDP, numNDP } = this.getCotizacionData();
    return `${tipNDP || '---'} ${serieNDP || '---'}-${numNDP || '---'}`;
  }

  get cotizacionEstadoLabel(): string {
    if (this.hasCotizacionVinculada) {
      return 'Vinculada';
    }

    return this.hasCotizacionAsociada ? 'Incompleta' : 'Pendiente';
  }

  get origenLabel(): string {
    const selected = this.cleanText(this.form.get('origen')?.value);
    if (selected) {
      return selected;
    }
    return this.hasCotizacionAsociada ? 'Cotización' : 'Manual';
  }

  save(): void {
    this.syncCotizacionValidation();
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    const codCliente = this.resolveClienteCode();
    const payload: OportunidadFormValue = {
      proceso: this.isEditing ? 1 : 0,
      idOportunidad: this.oportunidadId || 0,
      codCliente,
      titulo: this.form.get('titulo')?.value ?? '',
      descripcion: this.form.get('descripcion')?.value ?? '',
      montoEstimado: Number(this.form.get('montoEstimado')?.value ?? 0),
      probabilidad: Number(this.form.get('probabilidad')?.value ?? 0),
      etapa: (this.form.get('etapa')?.value as OportunidadFormValue['etapa']) ?? 'PROSPECTO',
      vendedor: this.form.get('vendedor')?.value ?? '',
      fechaCierreEstimada: this.normalizeDateForApi(this.form.get('fechaCierreEstimada')?.value),
      origen: this.cleanText(this.form.get('origen')?.value),
      prioridad: this.cleanText(this.form.get('prioridad')?.value),
      tipoCliente: this.cleanText(this.form.get('tipoCliente')?.value),
      tipNDP: this.cleanText(this.form.get('tipNDP')?.value).toUpperCase(),
      serieNDP: this.cleanText(this.form.get('serieNDP')?.value),
      numNDP: this.cleanText(this.form.get('numNDP')?.value),
      respuesta: ''
    };

    const request$ =
      this.isEditing && this.oportunidadId ? this.oportunidadService.update(this.oportunidadId, payload) : this.oportunidadService.create(payload);

    request$
      .pipe(
        finalize(() => (this.isSaving = false))
      )
      .subscribe({
        next: async (response) => {
          await Swal.fire({
            title: this.isEditing ? 'Oportunidad actualizada' : 'Oportunidad creada',
            text: response?.mensaje || 'La operación se completó correctamente.',
            icon: 'success',
            timer: 1800,
            showConfirmButton: false
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

    this.clienteSearchInput$.next(value);
  }

  openClienteDropdown(): void {
    if (this.clienteFieldLocked) {
      return;
    }

    this.clienteDropdownOpen = true;
  }

  clearClienteSearch(): void {
    if (this.clienteFieldLocked) {
      return;
    }

    this.clienteSearchTerm = '';
    this.clienteSuggestions = [];
    this.clienteSearchLoading = false;
    this.form.patchValue({ codCliente: '' }, { emitEvent: false });
    this.clienteDropdownOpen = true;
    this.form.get('codCliente')?.markAsTouched();
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
    this.clienteSuggestions = [];
    this.clienteSearchTerm = option.label;
    this.form.patchValue({ codCliente: option.value }, { emitEvent: true });
    this.clienteDropdownOpen = false;
  }

  openNuevoCliente(): void {
    this.router.navigate(['/catalogos/clientes/nuevo']);
  }

  openNuevaCotizacion(): void {
    const codCliente = this.resolveClienteCode();
    if (!codCliente) {
      window.alert('Seleccione un cliente antes de crear la cotización.');
      return;
    }

    if (!this.cleanText(this.form.get('codCliente')?.value)) {
      this.form.patchValue({ codCliente }, { emitEvent: false });
    }

    const clienteContext = this.buildClienteContextFromForm();
    if (!clienteContext) {
      window.alert('La información del cliente no está disponible. Intente seleccionarlo nuevamente.');
      return;
    }

    const queryParams: Record<string, string | number> = {
      origin: 'oportunidad-form',
      codCliente,
      clienteNombre: this.cleanText(clienteContext.nombre) || codCliente,
      returnUrl: this.router.url,
      codVendedor: this.cleanText(this.form.get('vendedor')?.value),
      titulo: this.cleanText(this.form.get('titulo')?.value),
      descripcion: this.cleanText(this.form.get('descripcion')?.value),
      etapaActual: this.cleanText(this.form.get('etapa')?.value)
    };

    if (this.oportunidadId) {
      queryParams['oportunidadId'] = this.oportunidadId;
    }

    const state = {
      origin: 'oportunidad-form',
      cliente: clienteContext,
      returnUrl: this.router.url,
      oportunidadDraft: this.buildNavigationDraft()
    };

    void this.router.navigate(['/ventas/pedidos/nuevo'], {
      queryParams,
      state
    });
  }

  private ensureClienteOption(value: string, label: string): void {
    const codigo = this.cleanText(value);
    if (!codigo || this.clientesOptions.some((item) => item.value === codigo)) {
      return;
    }
    const name = this.extractClienteNombre(label, codigo) || codigo;
    this.clientesOptions = [{ value: codigo, name, label: `${name} (${codigo})` }, ...this.clientesOptions];
  }

  private buildClienteContextFromForm(): ClienteUI | null {
    const codigo = this.cleanText(this.form.get('codCliente')?.value);
    if (!codigo) {
      return null;
    }
    const nombre = this.selectedClienteNombre || codigo;
    return {
      codigo                ,
      nombre                ,
      ruc                   : '',
      contacto              : '',
      nombreContacto        : '',
      contactoPrincipal     : '',
      emailPrincipal        : '',
      telefonoPrincipal     : '',
      cargoPrincipal        : '',
      direccion             : '',
      provincia             : '',
      ciudad                : '',
      pais                  : '',
      zona                  : '',
      email                 : '',
      telefono1             : '',
      telefono2             : '',
      fax                   : '',
      tipoCli               : '',
      mtoCredito            : 0,
      idProvincia           : '',
      idCanton              : '',
      idDistrito            : '',
      tCliente              : '',
      enviarCorreo          : false,
      totalContactos        : 0,
      contactos             : []
    };
  }

  private setupCotizacionBehavior(): void {
    this.clienteSearchInput$
      .pipe(debounceTime(250), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((term) => {
        this.searchClientes(term);
      });

    this.form
      .get('codCliente')
      ?.valueChanges.pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.syncClienteSearchTerm();
      });

    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.syncCotizacionValidation();
      this.syncLockedFields();
    });
  }

  private searchClientes(value: string): void {
    const term = this.cleanText(value);
    if (this.clienteFieldLocked || !term) {
      this.clienteSearchLoading = false;
      this.clienteSuggestions = [];
      return;
    }

    this.clienteSearchLoading = true;
    this.clienteService
      .getClientesListado(1, 20, term)
      .pipe(
        catchError((error) => {
          console.error('Error al buscar clientes para oportunidades:', error);
          return of({
            data: [] as ClienteListado[],
            totalRegistros: 0,
            paginaActual: 1,
            pageSize: 20,
            totalPages: 1
          });
        }),
        finalize(() => {
          this.clienteSearchLoading = false;
        })
      )
      .subscribe((response) => {
        this.clienteSuggestions = (response.data ?? []).map((cliente) => ({
          value: cliente.id,
          name: cliente.nombre,
          label: `${cliente.nombre} (${cliente.id})`
        }));
      });
  }

  private restoreOrderResultFromNavigation(): void {
    const navigationState = this.router.getCurrentNavigation()?.extras.state as
      | (Record<string, unknown> & { from?: string; orderResult?: OrdenPedidoReturnInfo; oportunidadDraft?: OportunidadNavigationDraft })
      | null;
    const fallbackState =
      typeof window !== 'undefined'
        ? (window.history.state as Record<string, unknown> & { from?: string; orderResult?: OrdenPedidoReturnInfo; oportunidadDraft?: OportunidadNavigationDraft })
        : null;
    const state = navigationState ?? fallbackState;
    if (state?.from !== 'orden-pedido-form') {
      return;
    }

    this.pendingOrderResultFromNavigation = state.orderResult || null;
    this.pendingDraftFromNavigation = state.oportunidadDraft || null;
    this.shouldCleanReturnState = true;
  }

  private applyNavigationReturnState(): void {
    if (this.pendingDraftFromNavigation) {
      this.applyDraftFromNavigation(this.pendingDraftFromNavigation);
      this.pendingDraftFromNavigation = null;
    }

    if (this.pendingOrderResultFromNavigation) {
      this.applyOrderResultFromNavigation(this.pendingOrderResultFromNavigation);
      this.pendingOrderResultFromNavigation = null;
    }

    if (this.shouldCleanReturnState && typeof window !== 'undefined') {
      const fallbackState = window.history.state as Record<string, unknown>;
      const cleaned = { ...fallbackState };
      delete cleaned['orderResult'];
      delete cleaned['oportunidadDraft'];
      delete cleaned['from'];
      window.history.replaceState(cleaned, '', window.location.href);
      this.shouldCleanReturnState = false;
    }
  }

  private applyDraftFromNavigation(draft: OportunidadNavigationDraft): void {
    const form = draft?.form;
    if (!form) {
      return;
    }

    if (form.codCliente) {
      const clienteNombre = this.extractClienteNombre(draft.clienteSearchTerm, form.codCliente) || form.codCliente;
      this.ensureClienteOption(form.codCliente, clienteNombre);
    }

    this.form.patchValue(
      {
        codCliente        : this.cleanText(form.codCliente),
        titulo            : this.cleanText(form.titulo),
        descripcion       : this.cleanText(form.descripcion),
        montoEstimado     : Number(form.montoEstimado || 0),
        probabilidad      : Number(form.probabilidad || 0),
        etapa             : this.cleanText(form.etapa) || 'PROSPECTO',
        vendedor          : this.cleanText(form.vendedor),
        fechaCierreEstimada: this.cleanText(form.fechaCierreEstimada),
        origen            : this.resolveOrigenValue(form.origen),
        prioridad         : this.resolvePrioridadValue(form.prioridad),
        tipoCliente       : this.resolveTipoClienteValue(form.tipoCliente),
        tipNDP            : this.cleanText(form.tipNDP),
        serieNDP          : this.cleanText(form.serieNDP),
        numNDP            : this.cleanText(form.numNDP)
      },
      { emitEvent: false }
    );

    if (draft.clienteSearchTerm) {
      this.clienteSearchTerm = draft.clienteSearchTerm;
    }
  }

  private buildNavigationDraft(): OportunidadNavigationDraft {
    const raw = this.form.getRawValue();
    return {
      form: {
        codCliente        : this.cleanText(raw.codCliente),
        titulo            : this.cleanText(raw.titulo),
        descripcion       : this.cleanText(raw.descripcion),
        montoEstimado     : Number(raw.montoEstimado || 0),
        probabilidad      : Number(raw.probabilidad || 0),
        etapa             : this.cleanText(raw.etapa),
        vendedor          : this.cleanText(raw.vendedor),
        fechaCierreEstimada: this.cleanText(raw.fechaCierreEstimada),
        origen            : this.resolveOrigenValue(raw.origen),
        prioridad         : this.resolvePrioridadValue(raw.prioridad),
        tipoCliente       : this.resolveTipoClienteValue(raw.tipoCliente),
        tipNDP            : this.cleanText(raw.tipNDP),
        serieNDP          : this.cleanText(raw.serieNDP),
        numNDP            : this.cleanText(raw.numNDP)
      },
      clienteSearchTerm: this.cleanText(this.clienteSearchTerm)
    };
  }

  private applyOrderResultFromNavigation(orderResult: OrdenPedidoReturnInfo): void {
    if (!orderResult) {
      return;
    }

    // Parsear el número de cotización por si viene en formato combinado
    const parsed = this.oportunidadService.parseQuotationNumber(
      orderResult.tipOrden,
      orderResult.serie,
      orderResult.numero
    );

    this.form.patchValue(
      {
        montoEstimado   : orderResult.total,
        tipNDP          : parsed.tipNDP.toUpperCase(),
        serieNDP        : parsed.serie,
        numNDP          : parsed.numero
      },
      { emitEvent: false }
    );

    this.syncCotizacionValidation();
    this.syncLockedFields();
  }

  private syncCotizacionValidation(): void {
    const tipControl = this.form.get('tipNDP');
    const serieControl = this.form.get('serieNDP');
    const numeroControl = this.form.get('numNDP');
    if (!tipControl || !serieControl || !numeroControl) {
      return;
    }

    const requiresAll = this.hasCotizacionAsociada;
    const controls = [tipControl, serieControl, numeroControl];
    controls.forEach((control) => {
      if (requiresAll) {
        control.setValidators([Validators.required]);
      } else {
        control.clearValidators();
      }
      control.updateValueAndValidity({ emitEvent: false });
    });
  }

  private syncLockedFields(): void {
    const codClienteControl = this.form.get('codCliente');
    const lockCliente = this.isEditing || this.hasCotizacionAsociada;

    if (lockCliente) {
      codClienteControl?.disable({ emitEvent: false });
    } else {
      codClienteControl?.enable({ emitEvent: false });
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

  private getCotizacionData(): { tipNDP: string; serieNDP: string; numNDP: string } {
    return {
      tipNDP: this.cleanText(this.form.get('tipNDP')?.value).toUpperCase(),
      serieNDP: this.cleanText(this.form.get('serieNDP')?.value),
      numNDP: this.cleanText(this.form.get('numNDP')?.value)
    };
  }

  private resolveClienteCode(): string {
    const formCode = this.cleanText(this.form.get('codCliente')?.value);
    if (formCode) {
      return formCode;
    }

    const fromSearch = this.extractClienteCode(this.clienteSearchTerm);
    return this.cleanText(fromSearch);
  }

  private extractClienteCode(value: string): string {
    const text = this.cleanText(value);
    if (!text) {
      return '';
    }

    const match = text.match(/\(([^)]+)\)\s*$/);
    if (match?.[1]) {
      return this.cleanText(match[1]);
    }

    return text;
  }

  private extractClienteNombre(value: string, codigo: string): string {
    const text = this.cleanText(value);
    if (!text) {
      return '';
    }

    const code = this.cleanText(codigo);
    if (!code) {
      return text;
    }

    const suffix = new RegExp(`\\s*\\(${this.escapeRegex(code)}\\)\\s*$`, 'i');
    return text.replace(suffix, '').trim();
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private cleanText(value: unknown): string {
    return String(value ?? '').trim();
  }

  private getDefaultClosingDate(): string {
    /**
     * Calcula una fecha de cierre estimada prudencial: 30 días desde hoy.
     * Formato: yyyy-MM-dd (compatible con input type="date")
     */
    const today = new Date();
    const closingDate = new Date(today);
    closingDate.setDate(closingDate.getDate() + 30);

    const year = closingDate.getFullYear();
    const month = String(closingDate.getMonth() + 1).padStart(2, '0');
    const day = String(closingDate.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private normalizeDateForApi(value: unknown): string | null {
    const raw = this.cleanText(value);
    if (!raw) {
      return null;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      return `${raw}T00:00:00.000Z`;
    }

    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }
    return parsed.toISOString();
  }

  private toInputDate(value: string | null | undefined): string {
    const raw = this.cleanText(value);
    if (!raw) {
      return '';
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      return raw;
    }

    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) {
      return '';
    }

    return parsed.toISOString().slice(0, 10);
  }

  private resolvePrioridadValue(value: unknown): string {
    const normalized = this.cleanText(value).toUpperCase();
    const found = this.prioridades.find((item) => item.toUpperCase() === normalized);
    return found || this.prioridades[1];
  }

  private resolveOrigenValue(value: unknown): string {
    const normalized = this.cleanText(value).toUpperCase();
    const found = this.origenes.find((item) => item.toUpperCase() === normalized);
    return found || this.origenes[0];
  }

  private resolveTipoClienteValue(value: unknown): string {
    const normalized = this.cleanText(value).toUpperCase();
    const found = this.tiposCliente.find((item) => item.toUpperCase() === normalized);
    return found || this.tiposCliente[0];
  }

  private getTodayForApi(): string {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    return `${day}/${month}/${year}`;
  }

}
