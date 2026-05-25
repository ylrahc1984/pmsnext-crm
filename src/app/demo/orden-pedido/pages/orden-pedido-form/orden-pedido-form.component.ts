import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { FormArray, FormGroup, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, of } from 'rxjs';
import { catchError, distinctUntilChanged, finalize, map, switchMap } from 'rxjs/operators';
import Swal from 'sweetalert2';

import { ClienteUI } from 'src/app/demo/catalogos/agencias-comisionistas/cliente.models';
import { ActividadComercialService } from 'src/app/demo/catalogos/agencias-comisionistas/actividad-comercial/actividad-comercial.service';
import { ClienteService } from 'src/app/demo/catalogos/agencias-comisionistas/cliente.service';
import { ListaPrecioUI } from 'src/app/demo/catalogos/listas-precios/lista-precio.models';
import { ListaPrecioService } from 'src/app/demo/catalogos/listas-precios/lista-precio.service';
import { PlanesTarifasService, PlanTarifaUI } from 'src/app/demo/catalogos/listas-precios/planes-tarifas.service';
import { FormaPago } from 'src/app/demo/administracion/forma-pago/forma-pago.models';
import { FormaPagoService } from 'src/app/demo/administracion/forma-pago/forma-pago.service';
import { MonedaService, MonedaUI } from 'src/app/demo/administracion/monedas/moneda.service';
import { PuntoVentaUI } from 'src/app/demo/administracion/usuarios/usuario.models';
import { UsuarioService } from 'src/app/demo/administracion/usuarios/usuario.service';
import { AuthService } from 'src/app/core/services/auth.service';
import { EmpresaContextService } from 'src/app/core/services/empresa-context.service';
import { NuevaFacturaClienteModalComponent } from 'src/app/finanzas/pages-factura/nueva-factura/nueva-factura-cliente-modal/nueva-factura-cliente-modal.component';
import { SelectorServiciosModalComponent } from 'src/app/finanzas/pages-factura/nueva-factura/selector-servicios-modal/selector-servicios-modal.component';
import { ModoPrecio, ServicioListaPrecioItem } from 'src/app/finanzas/services/servicios-lista-precio.service';
import { SharedModule } from 'src/app/theme/shared/shared.module';
import {
  OrdenPedidoCompletoDetalleItem,
  OrdenPedidoCompletoResponse,
  OrdenPedidoCreateResponse,
  OrdenPedidoCreatePayload,
  OrdenPedidoDetalleItem,
  OrdenPedidoExoneracion,
  OrdenPedidoExoneracionUpdate,
  OrdenPedidoPagoItem
} from '../../interfaces/orden-pedido.interface';
import { OrdenPedidoReturnInfo } from '../../interfaces/orden-pedido-return.interface';
import { OrdenPedidoService } from '../../services/orden-pedido.service';
import { OportunidadService } from 'src/app/demo/crm/oportunidades/oportunidad.service';

type OportunidadCotizacionContext = {
  oportunidadId     : number;
  codCliente        : string;
  clienteNombre     : string;
  codVendedor       : string;
  titulo            : string;
  descripcion       : string;
  etapaActual       : string;
};

type OportunidadPostCreateResult = {
  partial: boolean;
  message: string;
};

type OrdenPedidoNavigationState = {
  origin?: 'oportunidad-form' | 'oportunidad-detalle' | 'orden-pedido-list' | string;
  cliente?: ClienteUI;
  returnUrl?: string;
  oportunidadDraft?: unknown;
};

type DocumentoEdicionContext = {
  tipNDP: string;
  serieNDP: string;
  numNDP: string;
  estadoNDP: string;
};

@Component({
  selector: 'app-orden-pedido-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    SharedModule,
    NuevaFacturaClienteModalComponent,
    SelectorServiciosModalComponent
  ],
  templateUrl: './orden-pedido-form.component.html',
  styleUrls: ['./orden-pedido-form.component.scss']
})
export class OrdenPedidoFormComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly actividadComercialService = inject(ActividadComercialService);
  private readonly clienteService = inject(ClienteService);
  private readonly planesTarifasService = inject(PlanesTarifasService);
  private readonly listaPrecioService = inject(ListaPrecioService);
  private readonly monedaService = inject(MonedaService);
  private readonly formaPagoService = inject(FormaPagoService);
  private readonly usuarioService = inject(UsuarioService);
  private readonly empresaContext = inject(EmpresaContextService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly ordenPedidoService = inject(OrdenPedidoService);
  private readonly oportunidadService = inject(OportunidadService);

  readonly empresa = this.empresaContext.empresa;
  readonly tiposDocumento = [
    { value: 'NDP', label: 'Orden de Pedido' },
    { value: 'COT', label: 'Proforma' }
  ];

  readonly form = this.fb.group({
    tipNDP: this.fb.control('NDP', { validators: [Validators.required] }),
    pntVenta: this.fb.control(''),
    moneda: this.fb.control(''),
    planTarifario: this.fb.control(''),
    listaPrecio: this.fb.control(''),
    fecNDP: this.fb.control(this.getTodayIsoDate(), { validators: [Validators.required] }),
    horaNDP: this.fb.control(this.getCurrentTime(), { validators: [Validators.required] }),
    codVendedor: this.fb.control(''),
    codCliente: this.fb.control(''),
    rucCliente: this.fb.control(''),
    nomCliente: this.fb.control('', { validators: [Validators.required] }),
    observaciones: this.fb.control(''),
    detalle: this.fb.array<FormGroup>([], { validators: [Validators.required] }),
    pagos: this.fb.array<FormGroup>([]),
    subTotal: this.fb.control(0),
    impuesto: this.fb.control(0),
    totDocu: this.fb.control(0),
    totalPago: this.fb.control(0),
    exoneracionActiva: this.fb.control(false),
    exoneracion: this.fb.group({
      tipoDocumentoEX1: this.fb.control(''),
      numeroDocumento: this.fb.control(''),
      nombreInstitucion: this.fb.control(''),
      tarifaExonerada: this.fb.control(0),
      montoExoneracion: this.fb.control(0)
    })
  });

  isSubmitting = false;
  errorMessage = '';
  successMessage = '';
  monedasCatalogo: MonedaUI[] = [];
  formasPagoCatalogo: FormaPago[] = [];
  puntosVentaCatalogo: PuntoVentaUI[] = [];
  planesTarifariosCatalogo: PlanTarifaUI[] = [];
  listasPrecioCatalogo: ListaPrecioUI[] = [];
  monedasLoading = false;
  formasPagoLoading = false;
  puntosVentaLoading = false;
  planesTarifariosLoading = false;
  listasPrecioLoading = false;
  showClienteModal = false;
  selectedCliente: ClienteUI | null = null;
  showServicioModal = false;
  modoReserva = false;
  modoOportunidad = false;
  isEditingExistingOrder = false;
  isLoadingExistingOrder = false;
  clienteSuggestions: ClienteUI[] = [];
  clienteBusquedaLoading = false;
  oportunidadContexto: OportunidadCotizacionContext | null = null;
  clienteCorreo = '';
  clienteCodigoActividad = '';
  clienteActividadLoading = false;
  private clienteActividadCedula = '';
  private previousListaPrecio = '';
  private suppressListaPrecioChange = false;
  private navigationState: OrdenPedidoNavigationState | null = null;
  private originComponent: string | null = null;
  private returnUrl = '';
  private shouldReturnToOpportunity = false;
  private opportunityContextKey = '';
  private documentoEdicionContext: DocumentoEdicionContext | null = null;

  ngOnInit(): void {
    const navigationState = (this.router.getCurrentNavigation()?.extras.state ?? null) as OrdenPedidoNavigationState | null;
    const historyState =
      typeof window !== 'undefined' ? (window.history.state as (OrdenPedidoNavigationState & Record<string, unknown>) | null) : null;
    this.navigationState = navigationState ?? historyState;
    const queryOrigin = this.cleanText(this.route.snapshot.queryParamMap.get('origin')).toLowerCase();
    const navOrigin = this.cleanText(navigationState?.origin).toLowerCase();
    const historyOrigin = this.cleanText(historyState?.origin).toLowerCase();
    const resolvedOrigin = navOrigin || historyOrigin || queryOrigin;
    this.originComponent =
      resolvedOrigin === 'oportunidad-form' ? 'oportunidad-form' : resolvedOrigin === 'orden-pedido-list' ? 'orden-pedido-list' : null;
    if (resolvedOrigin === 'oportunidad-detalle') {
      this.originComponent = 'oportunidad-detalle';
    }
    this.shouldReturnToOpportunity = resolvedOrigin === 'oportunidad-form' || resolvedOrigin === 'oportunidad-detalle';
    const queryReturnUrl = this.cleanText(this.route.snapshot.queryParamMap.get('returnUrl'));
    const stateReturnUrl = this.cleanText(navigationState?.returnUrl || historyState?.returnUrl);
    this.returnUrl = this.normalizeReturnUrl(stateReturnUrl || queryReturnUrl);

    const currentUser = this.authService.getCurrentUser();
    if (currentUser?.usuario) {
      this.form.controls.codVendedor.setValue(currentUser.usuario);
    }

    this.addPago();

    this.detalleArray.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.recalculateTotals());
    this.pagosArray.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.syncPagosFormaPago();
      this.updateTotalPago();
    });
    this.form.controls.moneda.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((moneda) => {
      this.syncPagosMoneda(moneda);
    });
    this.form.controls.fecNDP.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.syncPagosFormaPago();
    });
    this.form.controls.codCliente.valueChanges
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        map((value) => String(value ?? '').trim()),
        distinctUntilChanged(),
        switchMap((term) => {
          if (!term || this.modoReserva || this.modoOportunidad) {
            this.clienteSuggestions = [];
            return of<ClienteUI[]>([]);
          }
          this.clienteBusquedaLoading = true;
          return this.clienteService.getClientes(1, 10, term).pipe(
            map((result) => result.data ?? []),
            catchError(() => of<ClienteUI[]>([])),
            finalize(() => {
              this.clienteBusquedaLoading = false;
            })
          );
        })
      )
      .subscribe((clientes) => {
        this.clienteSuggestions = clientes;
      });
    this.form.controls.listaPrecio.valueChanges
      .pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((listaPrecio) => {
        this.onListaPrecioChange((listaPrecio || '').toString());
        this.syncDetalleCatalogCodes();
      });
    this.form.controls.planTarifario.valueChanges
      .pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.syncDetalleCatalogCodes();
      });
    this.form.controls.exoneracionActiva.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((active) => {
      if (!active) {
        this.form.controls.exoneracion.reset({
          tipoDocumentoEX1: '',
          numeroDocumento: '',
          nombreInstitucion: '',
          tarifaExonerada: 0,
          montoExoneracion: 0
        });
      }
      this.recalculateTotals();
    });
    this.form.controls.exoneracion.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.recalculateTotals());

    this.loadMonedas();
    this.loadFormasPago();
    this.loadPuntosVenta();
    this.loadPlanesTarifarios();
    this.loadListasPrecio();
    this.initDocumentoFromQuery();
    this.initOportunidadFromQuery();
    this.initClienteFromQuery();
    this.recalculateTotals();
  }

  get detalleArray(): FormArray<FormGroup> {
    return this.form.controls.detalle;
  }

  get pagosArray(): FormArray<FormGroup> {
    return this.form.controls.pagos;
  }

  removeDetalle(index: number): void {
    this.detalleArray.removeAt(index);
    this.recalculateTotals();
  }

  addPago(): void {
    this.pagosArray.push(
      this.fb.group({
        orden           : this.fb.control(this.pagosArray.length + 1),
        frmPago         : this.fb.control(this.formasPagoCatalogo[0]?.codigo ?? ''),
        tipo            : this.fb.control(''),
        numTarjeta      : this.fb.control(''),
        referencia      : this.fb.control(''),
        moneda          : this.fb.control(this.form.controls.moneda.value || ''),
        monto           : this.fb.control(0),
        montoOri        : this.fb.control(0),
        tCambio         : this.fb.control(1),
        vencimiento     : this.fb.control(this.formatDateForApi(this.form.controls.fecNDP.value)),
        caja            : this.fb.control(''),
        turno           : this.fb.control('')
      })
    );
    this.syncPagosFormaPago();
    this.updateTotalPago();
  }

  removePago(index: number): void {
    if (this.pagosArray.length === 1) {
      return;
    }
    this.pagosArray.removeAt(index);
    this.updateTotalPago();
  }

  volverListado(): void {
    void this.navigateBack();
  }

  private navigateBack(orderResult?: OrdenPedidoReturnInfo): void {
    if (this.returnUrl && this.originComponent) {
      if (this.shouldReturnToOpportunity) {
        const state: Record<string, unknown> = { from: 'orden-pedido-form' };
        if (orderResult) {
          state['orderResult'] = orderResult;
        }
        if (this.navigationState?.oportunidadDraft) {
          state['oportunidadDraft'] = this.navigationState.oportunidadDraft;
        }
        void this.router.navigateByUrl(this.returnUrl, {
          state
        });
        return;
      }

      void this.router.navigateByUrl(this.returnUrl);
      return;
    }

    if (this.shouldReturnToOpportunity) {
      const state: Record<string, unknown> = { from: 'orden-pedido-form' };
      if (orderResult) {
        state['orderResult'] = orderResult;
      }
      if (this.navigationState?.oportunidadDraft) {
        state['oportunidadDraft'] = this.navigationState.oportunidadDraft;
      }
      void this.router.navigate(['/crm/oportunidades'], { state });
      return;
    }

    void this.router.navigate(['/demo/ordenes-pedido']);
  }

  abrirModalClientes(): void {
    if (this.modoReserva || this.modoOportunidad) {
      return;
    }
    this.showClienteModal = true;
  }

  abrirModalServicios(): void {
    if (this.modoReserva) {
      return;
    }
    const codLista = (this.form.controls.listaPrecio.value || '').toString().trim();
    if (!codLista) {
      window.alert('Seleccione la lista de precios antes de agregar servicios.');
      return;
    }
    this.showServicioModal = true;
  }

  cerrarModalServicios(): void {
    this.showServicioModal = false;
  }

  onClienteSelected(cliente: ClienteUI): void {
    if (this.modoReserva || this.modoOportunidad) {
      return;
    }
    this.hydrateClienteByCodigo(cliente?.codigo, cliente);
    this.showClienteModal = false;
  }

  onServicioSelected(servicio: ServicioListaPrecioItem): void {
    if (this.modoReserva) {
      return;
    }
    this.showServicioModal = false;
    this.addDetalleFromServicio(servicio);
  }

  limpiarSeleccionCliente(): void {
    if (this.modoReserva || this.modoOportunidad) {
      return;
    }
    this.selectedCliente = null;
    this.clienteCorreo = '';
    this.clienteCodigoActividad = '';
    this.clienteActividadLoading = false;
    this.clienteActividadCedula = '';
    this.form.patchValue(
      {
        codCliente: '',
        nomCliente: '',
        rucCliente: ''
      },
      { emitEvent: false }
    );
  }

  private applySelectedCliente(cliente: ClienteUI): void {
    this.selectedCliente = cliente;
    this.clienteCorreo = cliente.emailPrincipal || cliente.email || '';
    this.form.patchValue(
      {
        codCliente: cliente.codigo,
        nomCliente: cliente.nombre,
        rucCliente: cliente.ruc
      },
      { emitEvent: false }
    );
    this.loadClienteActividad(cliente.ruc);
  }

  selectClienteSuggestion(cliente: ClienteUI): void {
    if (this.modoReserva || this.modoOportunidad) {
      return;
    }
    this.hydrateClienteByCodigo(cliente?.codigo, cliente);
    this.clienteSuggestions = [];
  }

  private hydrateClienteByCodigo(codigo: string, fallback?: ClienteUI | null): void {
    const cleanCodigo = this.cleanText(codigo);
    if (!cleanCodigo) {
      if (fallback) {
        this.applySelectedCliente(fallback);
      }
      return;
    }

    this.clienteService
      .getClienteByCodigo(cleanCodigo)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (cliente) => {
          if (cliente) {
            this.applySelectedCliente(cliente);
            return;
          }

          if (fallback) {
            this.applySelectedCliente(fallback);
          }
        },
        error: () => {
          if (fallback) {
            this.applySelectedCliente(fallback);
          }
        }
      });
  }

  async guardar(): Promise<void> {
    this.errorMessage = '';
    this.successMessage = '';

    if (this.form.invalid || this.detalleArray.length === 0) {
      this.form.markAllAsTouched();
      await Swal.fire({
        title: 'Información incompleta',
        text: 'Complete la información general y agregue al menos un producto válido.',
        icon: 'warning',
        confirmButtonText: 'Entendido'
      });
      return;
    }

    const confirmation = await Swal.fire({
      title: this.isEditingExistingOrder ? 'Confirmar actualización' : 'Confirmar guardado',
      text: this.isEditingExistingOrder
        ? `¿Desea guardar cambios en este ${this.form.controls.tipNDP.value === 'COT' ? 'documento de cotización' : 'documento de pedido'}?`
        : `¿Desea guardar esta ${this.form.controls.tipNDP.value === 'COT' ? 'proforma' : 'orden de pedido'}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: this.isEditingExistingOrder ? 'Sí, actualizar' : 'Sí, guardar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true
    });

    if (!confirmation.isConfirmed) {
      return;
    }

    const payload = this.buildPayload();
    this.isSubmitting = true;
    const isUpdateMode = this.isEditingExistingOrder && !!this.documentoEdicionContext;
    const request$ = isUpdateMode
      ? this.ordenPedidoService.actualizarOrden(
          this.documentoEdicionContext!.tipNDP,
          this.getNumeroDocumentoForUpdate(this.documentoEdicionContext!),
          payload
        )
      : this.ordenPedidoService.crearOrden(payload);

    console.log('Orden pedido payload', payload);
    request$
      .pipe(
        switchMap((response) => {
          if (this.cleanText(response?.respuesta).toUpperCase() !== 'OK') {
            return of({ response, opportunityResult: null as OportunidadPostCreateResult | null });
          }

          return this.syncOportunidadCotizacion(response).pipe(
            map((opportunityResult) => ({ response, opportunityResult }))
          );
        }),
        finalize(() => (this.isSubmitting = false))
      )
      .subscribe({
        next: (result: { response: OrdenPedidoCreateResponse; opportunityResult: OportunidadPostCreateResult | null }) => {
          const orderResult = this.buildOrderReturnInfo(result.response, payload);
          const successMessage = this.buildCreateSuccessMessage(result.response, result.opportunityResult?.message);
          if (this.cleanText(result.response?.respuesta).toUpperCase() === 'OK') {
            void Swal.fire({
              title: result.opportunityResult?.partial
                ? 'Cotización creada con observaciones'
                : isUpdateMode
                  ? 'Actualizado'
                  : 'Guardado',
              text: successMessage,
              icon: result.opportunityResult?.partial ? 'warning' : 'success',
              confirmButtonText: 'Aceptar'
            }).then(() => {
              void this.navigateBack(orderResult);
            });
            return;
          }

          void Swal.fire({
            title: 'Resultado',
            text: successMessage,
            icon: 'info',
            confirmButtonText: 'Aceptar'
          });
        },
        error: (error: Error) => {
          this.errorMessage = error.message || (isUpdateMode ? 'No se pudo actualizar la orden.' : 'No se pudo crear la orden.');
          void Swal.fire({
            title: 'Error',
            text: this.errorMessage,
            icon: 'error',
            confirmButtonText: 'Aceptar'
          });
        }
      });
  }

  trackByIndex(index: number): number {
    return index;
  }

  get tipoDocumentoLabel(): string {
    return this.form.controls.tipNDP.value === 'COT' ? 'Proforma Comercial' : 'Orden de Pedido Comercial';
  }

  get saldoPendiente(): number {
    return Number((this.form.controls.totDocu.value - this.form.controls.totalPago.value).toFixed(2));
  }

  get modoPrecioSeleccionado(): ModoPrecio {
    const planId = Number(this.form.controls.planTarifario.value ?? 0) || 0;
    const plan = this.planesTarifariosCatalogo.find((item) => Number(item.planId ?? 0) === planId);
    const tipo = (plan?.tipoTarifa || '').toString().trim().toUpperCase();
    return tipo === 'N' ? 'N' : 'R';
  }

  get opportunityDocumentLabel(): string {
    const titulo = this.cleanText(this.oportunidadContexto?.titulo);
    return titulo ? `Oportunidad: ${titulo}` : 'Cotizacion generada desde CRM';
  }

  get editingDocumentLabel(): string {
    if (!this.isEditingExistingOrder || !this.documentoEdicionContext) {
      return '';
    }

    const { tipNDP, serieNDP, numNDP } = this.documentoEdicionContext;
    return [tipNDP, serieNDP, numNDP].filter((value) => this.cleanText(value)).join(' ');
  }

  private recalculateTotals(): void {
    let subtotal = 0;
    let impuestoBruto = 0;

    this.detalleArray.controls.forEach((group) => {
      const cantidad = this.toNumber(group.get('canProdu')?.value);
      const precio = this.toNumber(group.get('pUndLst')?.value);
      const porDescuento = this.toNumber(group.get('porDescu')?.value);
      const porImpuesto = this.toNumber(group.get('porImpu')?.value);

      const bruto = cantidad * precio;
      const mtoDescu = bruto * (porDescuento / 100);
      const totalNeto = bruto - mtoDescu;
      const mtoImpu = totalNeto * (porImpuesto / 100);
      const mtoTotal = totalNeto + mtoImpu;

      group.patchValue(
        {
          mtoDescu: this.round(mtoDescu),
          totalNeto: this.round(totalNeto),
          mtoImpu: this.round(mtoImpu),
          mtoTotal: this.round(mtoTotal)
        },
        { emitEvent: false }
      );

      subtotal += totalNeto;
      impuestoBruto += mtoImpu;
    });

    const exoneracion = this.calculateExoneracion(impuestoBruto);
    const impuesto = Math.max(impuestoBruto - exoneracion, 0);
    const total = subtotal + impuesto;

    this.form.patchValue(
      {
        subTotal: this.round(subtotal),
        impuesto: this.round(impuesto),
        totDocu: this.round(total)
      },
      { emitEvent: false }
    );

    this.updateTotalPago();
  }

  private updateTotalPago(): void {
    const totalPago = this.pagosArray.controls.reduce((acc, group) => acc + this.toNumber(group.get('monto')?.value), 0);
    this.form.controls.totalPago.setValue(this.round(totalPago), { emitEvent: false });
  }

  private createDetalleGroup(): FormGroup {
    return this.fb.group({
      codProdu: this.fb.control(''),
      producto: this.fb.control('', { validators: [Validators.required] }),
      area: this.fb.control('TOURS'),
      uMedida: this.fb.control('Unid'),
      lstPrecio: this.fb.control(this.form.controls.listaPrecio.value),
      planTarifa: this.fb.control(this.form.controls.planTarifario.value),
      canProdu: this.fb.control(1, { validators: [Validators.required, Validators.min(0.01)] }),
      saldoPendiente: this.fb.control(0),
      pUndLst: this.fb.control(0, { validators: [Validators.required, Validators.min(0)] }),
      porDescu: this.fb.control(0),
      mtoDescu: this.fb.control(0),
      totalNeto: this.fb.control(0),
      porImpu: this.fb.control(13),
      mtoImpu: this.fb.control(0),
      mtoTotal: this.fb.control(0)
    });
  }

  private addDetalleFromServicio(servicio: ServicioListaPrecioItem): void {
    const group = this.createDetalleGroup();
    group.patchValue(
      {
        codProdu: (servicio.codigoServicio || '').toString(),
        producto: (servicio.nombreServicio || '').toString(),
        area: (servicio.area || 'TOURS').toString(),
        uMedida: 'Unid',
        lstPrecio: this.form.controls.listaPrecio.value,
        planTarifa: this.form.controls.planTarifario.value,
        canProdu: 1,
        pUndLst: Number(servicio.precioUnitario ?? 0) || 0,
        porDescu: 0,
        porImpu: 13
      },
      { emitEvent: false }
    );
    this.detalleArray.push(group);
    this.recalculateTotals();
  }

  private loadMonedas(): void {
    this.monedasLoading = true;
    this.monedaService
      .getAll()
      .pipe(
        finalize(() => {
          this.monedasLoading = false;
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response) => {
          const monedas = (response ?? [])
            .filter((item) => Number(item.activo) !== 0)
            .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));

          this.monedasCatalogo = monedas;

          const current = this.form.controls.moneda.value;
          const exists = monedas.some((item) => item.codMoneda === current);
          const defaultMoneda =
            monedas.find((item) => Number(item.primario) !== 0)?.codMoneda ??
            monedas[0]?.codMoneda ??
            '';

          if (!current || !exists) {
            this.form.controls.moneda.setValue(defaultMoneda, { emitEvent: false });
          }

          this.syncPagosMoneda(this.form.controls.moneda.value);
        },
        error: () => {
          this.monedasCatalogo = [];
        }
      });
  }

  private loadFormasPago(): void {
    this.formasPagoLoading = true;
    this.formaPagoService
      .getAll()
      .pipe(
        finalize(() => {
          this.formasPagoLoading = false;
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response) => {
          this.formasPagoCatalogo = (response ?? []).slice().sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
          this.syncPagosFormaPago();
        },
        error: () => {
          this.formasPagoCatalogo = [];
        }
      });
  }

  private loadPuntosVenta(): void {
    this.puntosVentaLoading = true;
    this.usuarioService
      .getPuntosVenta()
      .pipe(
        finalize(() => {
          this.puntosVentaLoading = false;
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response) => {
          const puntosVenta = (response ?? []).sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
          this.applyPuntosVentaCatalogo(puntosVenta);
        },
        error: (error) => {
          console.error('Error al cargar puntos de venta:', error);
          this.puntosVentaCatalogo = [];
        }
      });
  }

  private syncPagosFormaPago(): void {
    const defaultFrmPago = this.formasPagoCatalogo[0]?.codigo ?? '';
    this.pagosArray.controls.forEach((group, index) => {
      const orden = index + 1;
      if (this.toNumber(group.get('orden')?.value) !== orden) {
        group.get('orden')?.setValue(orden, { emitEvent: false });
      }

      const frmPago = String(group.get('frmPago')?.value ?? '').trim();
      const exists = this.formasPagoCatalogo.some((item) => item.codigo === frmPago);
      const codigo = !frmPago || !exists ? defaultFrmPago : frmPago;

      if (codigo && frmPago !== codigo) {
        group.get('frmPago')?.setValue(codigo, { emitEvent: false });
      }

      const formaPago = this.formasPagoCatalogo.find((item) => item.codigo === codigo);
      const tipo = formaPago?.tipoPago ?? '';
      if (String(group.get('tipo')?.value ?? '') !== tipo) {
        group.get('tipo')?.setValue(tipo, { emitEvent: false });
      }

      const monto = this.round(this.toNumber(group.get('monto')?.value));
      if (this.toNumber(group.get('montoOri')?.value) !== monto) {
        group.get('montoOri')?.setValue(monto, { emitEvent: false });
      }

      const tCambio = this.toNumber(group.get('tCambio')?.value) || 1;
      if (this.toNumber(group.get('tCambio')?.value) !== tCambio) {
        group.get('tCambio')?.setValue(tCambio, { emitEvent: false });
      }

      const vencimiento = this.calculatePagoVencimiento(codigo);
      if (vencimiento && String(group.get('vencimiento')?.value ?? '') !== vencimiento) {
        group.get('vencimiento')?.setValue(vencimiento, { emitEvent: false });
      }

    });
  }

  private loadPlanesTarifarios(): void {
    this.planesTarifariosLoading = true;
    this.planesTarifasService
      .getPlanesTarifas(1, 50)
      .pipe(
        finalize(() => {
          this.planesTarifariosLoading = false;
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response) => {
          this.planesTarifariosCatalogo = response ?? [];
          const current = this.form.controls.planTarifario.value;
          const exists = this.planesTarifariosCatalogo.some((item) => String(item.planId) === String(current));
          const defaultValue = this.planesTarifariosCatalogo[0]?.planId;

          if (!current || !exists) {
            this.form.controls.planTarifario.setValue(defaultValue !== undefined ? String(defaultValue) : '', {
              emitEvent: false
            });
          }
          this.syncDetalleCatalogCodes();
        },
        error: () => {
          this.planesTarifariosCatalogo = [];
        }
      });
  }

  private loadListasPrecio(): void {
    this.listasPrecioLoading = true;
    this.listaPrecioService
      .getListas({ pageNumber: 1, pageSize: 10 })
      .pipe(
        finalize(() => {
          this.listasPrecioLoading = false;
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response) => {
          this.listasPrecioCatalogo = response?.data ?? [];
          const current = this.form.controls.listaPrecio.value;
          const exists = this.listasPrecioCatalogo.some((item) => item.codigo === current);
          const defaultValue = this.listasPrecioCatalogo[0]?.codigo ?? '';

          if (!current || !exists) {
            this.form.controls.listaPrecio.setValue(defaultValue, { emitEvent: false });
            this.previousListaPrecio = defaultValue;
            this.syncDetalleCatalogCodes();
            return;
          }

          this.previousListaPrecio = (current || '').toString();
          this.syncDetalleCatalogCodes();
        },
        error: () => {
          this.listasPrecioCatalogo = [];
          this.form.controls.listaPrecio.setValue('', { emitEvent: false });
          this.previousListaPrecio = '';
        }
      });
  }

  private onListaPrecioChange(nextValue: string): void {
    if (this.suppressListaPrecioChange) {
      this.suppressListaPrecioChange = false;
      return;
    }

    const next = (nextValue || '').toString().trim();

    if (!this.previousListaPrecio) {
      this.previousListaPrecio = next;
      return;
    }

    if (next === this.previousListaPrecio) {
      return;
    }

    if (this.detalleArray.length > 0) {
      const confirmed = window.confirm('Cambiar la lista de precios eliminará las líneas actuales. ¿Desea continuar?');
      if (!confirmed) {
        this.suppressListaPrecioChange = true;
        this.form.controls.listaPrecio.setValue(this.previousListaPrecio, { emitEvent: false });
        return;
      }
      this.clearDetalle();
    }

    this.previousListaPrecio = next;
  }

  private clearDetalle(): void {
    this.detalleArray.clear();
    this.recalculateTotals();
  }

  private initDocumentoFromQuery(): void {
    const params = this.route.snapshot.queryParamMap;
    const tipNDP = this.cleanText(params.get('tipNDP')).toUpperCase();
    const serieNDP = this.cleanText(params.get('serieNDP'));
    const numNDP = this.cleanText(params.get('numNDP'));
    const mode = this.cleanText(params.get('mode')).toLowerCase();

    if (!tipNDP || !serieNDP || !numNDP) {
      return;
    }

    if (mode && mode !== 'edit' && mode !== 'view') {
      return;
    }

    this.isEditingExistingOrder = true;
    this.documentoEdicionContext = {
      tipNDP,
      serieNDP,
      numNDP,
      estadoNDP: 'ABI'
    };

    this.loadOrdenCompleta(this.documentoEdicionContext);
  }

  private loadOrdenCompleta(context: DocumentoEdicionContext): void {
    this.isLoadingExistingOrder = true;
    this.errorMessage = '';

    this.ordenPedidoService
      .getOrdenCompleta(context.tipNDP, context.serieNDP, context.numNDP)
      .pipe(
        finalize(() => {
          this.isLoadingExistingOrder = false;
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response) => {
          this.applyOrdenCompleta(response);
        },
        error: (error: Error) => {
          this.errorMessage = error.message || 'No se pudo cargar la orden para edición.';
        }
      });
  }

  private applyOrdenCompleta(response: OrdenPedidoCompletoResponse): void {
    const encabezado = response?.encabezado;
    if (!encabezado) {
      this.errorMessage = 'El endpoint no devolvió encabezado del documento.';
      return;
    }

    const tipNDP = this.cleanText(encabezado.ppV05_TipNDP).toUpperCase() || this.documentoEdicionContext?.tipNDP || 'NDP';
    const serieNDP = this.cleanText(encabezado.ppV05_SerieNDP) || this.documentoEdicionContext?.serieNDP || '';
    const numNDP = this.cleanText(encabezado.ppV05_NumNDP) || this.documentoEdicionContext?.numNDP || '';

    this.documentoEdicionContext = {
      tipNDP,
      serieNDP,
      numNDP,
      estadoNDP: this.cleanText(encabezado.ppV05_EstDocu) || 'ABI'
    };

    this.modoOportunidad = false;
    this.oportunidadContexto = null;
    this.setTipoDocumentoEditable(true);
    this.setClienteEditable(true);
    this.setListaPrecioEditable(true);
    this.setPlanTarifarioEditable(true);

    const fecNDP = this.parseApiDateToIso(encabezado.ppV05_FecDocu) || this.form.controls.fecNDP.value;
    const horaNDP = this.parseApiTime(encabezado.ppV05_HorDocu, encabezado.ppV05_FecDocu) || this.form.controls.horaNDP.value;

    this.form.patchValue(
      {
        tipNDP,
        pntVenta: this.cleanText(encabezado.ppV05_PntVenta),
        moneda: this.cleanText(encabezado.ppV05_Moneda),
        listaPrecio: this.cleanText(encabezado.ppV05_LPrecio),
        fecNDP,
        horaNDP,
        codVendedor: this.cleanText(encabezado.ppV05_CodVendedor),
        codCliente: this.cleanText(encabezado.ppV05_CodCliente),
        rucCliente: this.cleanText(encabezado.ppV05_RucCliente),
        nomCliente: this.cleanText(encabezado.ppV05_NomCliente),
        observaciones: this.cleanText(encabezado.ppV05_Observaciones),
        subTotal: this.round(this.toNumber(encabezado.ppV05_SubTotal)),
        impuesto: this.round(this.toNumber(encabezado.ppV05_Impuesto)),
        totDocu: this.round(this.toNumber(encabezado.ppV05_TotalDocu)),
        totalPago: this.round(this.toNumber(encabezado.ppV05_TotalPago)),
        exoneracionActiva: this.toNumber(encabezado.ppV05_Exonerado) > 0
      },
      { emitEvent: false }
    );

    this.clienteCorreo = this.cleanText(response?.cliente?.mpV00_Email);
    this.clienteCodigoActividad = this.cleanText(encabezado.ppV05_CActividad);

    this.detalleArray.clear();
    (response?.detalle ?? []).forEach((item) => {
      this.detalleArray.push(this.createDetalleGroupFromApi(item));
    });

    this.pagosArray.clear();
    if ((response?.formasPago ?? []).length > 0) {
      (response.formasPago ?? []).forEach((item, index) => {
        this.pagosArray.push(this.createPagoGroupFromApi(item, index + 1, this.cleanText(encabezado.ppV05_Moneda)));
      });
    } else {
      this.addPago();
    }

    if (this.detalleArray.length === 0) {
      this.errorMessage = 'El documento no contiene líneas de detalle para editar.';
    }

    this.syncPagosFormaPago();
    this.recalculateTotals();
  }

  private createDetalleGroupFromApi(item: OrdenPedidoCompletoDetalleItem): FormGroup {
    const group = this.createDetalleGroup();

    group.patchValue(
      {
        codProdu: this.cleanText(item.ppV06_CodProducto),
        producto: this.cleanText(item.ppV06_NomProducto),
        area: this.cleanText(item.ppV06_Categoria) || this.cleanText(item.ppV06_Linea) || 'TOURS',
        uMedida: this.cleanText(item.ppV06_UMedida) || 'Unid',
        lstPrecio: this.cleanText(item.ppV06_CodLstPrecio) || this.cleanText(this.form.controls.listaPrecio.value),
        planTarifa: this.cleanText(item.ppV06_PlanTarifario) || this.cleanText(this.form.controls.planTarifario.value),
        canProdu: this.toNumber(item.ppV06_Cantidad),
        pUndLst: this.round(this.toNumber(item.ppV06_PUndLst)),
        porDescu: this.round(this.toNumber(item.ppV06_PorDescu)),
        mtoDescu: this.round(this.toNumber(item.ppV06_Descuento)),
        totalNeto: this.round(this.toNumber(item.ppV06_TotalNeto)),
        porImpu: this.round(this.toNumber(item.ppV06_PorImpuesto)),
        mtoImpu: this.round(this.toNumber(item.ppV06_Impuestos)),
        mtoTotal: this.round(this.toNumber(item.ppV06_Precio))
      },
      { emitEvent: false }
    );

    return group;
  }

  private createPagoGroupFromApi(item: Record<string, unknown>, orden: number, moneda: string): FormGroup {
    const formaPago = this.readText(item, ['ppV07_FrmPago', 'frmPago']);
    const monto = this.toNumber(this.readValue(item, ['ppV07_Monto', 'monto']));
    const tCambio = this.toNumber(this.readValue(item, ['ppV07_TCambio', 'tCambio'])) || 1;

    return this.fb.group({
      orden: this.fb.control(orden),
      frmPago: this.fb.control(formaPago),
      tipo: this.fb.control(this.readText(item, ['ppV07_Tipo', 'tipo'])),
      numTarjeta: this.fb.control(this.readText(item, ['ppV07_NumTarjeta', 'numTarjeta'])),
      referencia: this.fb.control(this.readText(item, ['ppV07_Referencia', 'referencia'])),
      moneda: this.fb.control(this.readText(item, ['ppV07_Moneda', 'moneda']) || moneda),
      monto: this.fb.control(this.round(monto)),
      montoOri: this.fb.control(this.round(this.toNumber(this.readValue(item, ['ppV07_MontoOri', 'montoOri'])) || monto)),
      tCambio: this.fb.control(tCambio),
      vencimiento: this.fb.control(this.normalizePagoVencimiento(this.readText(item, ['ppV07_Vencimiento', 'vencimiento']))),
      caja: this.fb.control(this.readText(item, ['ppV07_Caja', 'caja'])),
      turno: this.fb.control(this.readText(item, ['ppV07_Turno', 'turno']))
    });
  }

  private readValue(source: Record<string, unknown>, keys: string[]): unknown {
    for (const key of keys) {
      if (source[key] !== undefined && source[key] !== null) {
        return source[key];
      }
    }
    return undefined;
  }

  private readText(source: Record<string, unknown>, keys: string[]): string {
    return this.cleanText(this.readValue(source, keys));
  }

  private parseApiDateToIso(value: string): string {
    const raw = this.cleanText(value);
    if (!raw) {
      return '';
    }

    const datePortion = raw.includes(' ') ? raw.split(' ')[0] : raw;

    if (/^\d{4}-\d{2}-\d{2}$/.test(datePortion)) {
      return datePortion;
    }

    const slashMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(datePortion);
    if (slashMatch) {
      return `${slashMatch[3]}-${slashMatch[2]}-${slashMatch[1]}`;
    }

    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) {
      return '';
    }

    return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
  }

  private parseApiTime(time: string, dateTime: string): string {
    const rawTime = this.cleanText(time);
    if (/^\d{2}:\d{2}:\d{2}$/.test(rawTime)) {
      return rawTime.slice(0, 5);
    }
    if (/^\d{2}:\d{2}$/.test(rawTime)) {
      return rawTime;
    }

    const rawDateTime = this.cleanText(dateTime);
    const dateTimeMatch = /(\d{2}:\d{2})(:\d{2})?$/.exec(rawDateTime);
    if (dateTimeMatch) {
      return dateTimeMatch[1];
    }

    return this.getCurrentTime();
  }

  private normalizePagoVencimiento(value: string): string {
    const raw = this.cleanText(value);
    if (!raw) {
      return this.formatDateForApi(this.form.controls.fecNDP.value);
    }

    if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
      return raw;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      return this.formatDateForApi(raw);
    }

    return this.formatDateForApi(this.form.controls.fecNDP.value);
  }

  private initOportunidadFromQuery(): void {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      if (this.isEditingExistingOrder) {
        return;
      }

      const routeOportunidadId = Number(this.route.snapshot.paramMap.get('id') ?? 0);
      const queryOportunidadId = Number(params.get('oportunidadId') ?? 0);
      const oportunidadId = queryOportunidadId > 0 ? queryOportunidadId : routeOportunidadId;
      const isFromOpportunityForm = this.originComponent === 'oportunidad-form';
      if (!isFromOpportunityForm && !oportunidadId) {
        return;
      }
      if (this.isSubmitting) {
        return;
      }

      const contextKey = isFromOpportunityForm ? 'oportunidad-form' : `oportunidad-${oportunidadId}`;
      if (this.opportunityContextKey === contextKey) {
        return;
      }
      this.opportunityContextKey = contextKey;

      const navigationCliente = this.navigationState?.cliente;
      const contexto: OportunidadCotizacionContext = {
        oportunidadId,
        codCliente: this.cleanText(navigationCliente?.codigo ?? params.get('codCliente')),
        clienteNombre: this.cleanText(navigationCliente?.nombre ?? params.get('clienteNombre')),
        codVendedor: this.cleanText(params.get('codVendedor')),
        titulo: this.cleanText(params.get('titulo')),
        descripcion: this.cleanText(params.get('descripcion')),
        etapaActual: this.cleanText(params.get('etapaActual')).toUpperCase()
      };

      this.modoOportunidad = true;
      this.oportunidadContexto = contexto;
      this.form.controls.tipNDP.setValue('COT', { emitEvent: false });
      this.setTipoDocumentoEditable(false);
      this.setClienteEditable(false);

      if (contexto.codVendedor) {
        this.form.controls.codVendedor.setValue(contexto.codVendedor, { emitEvent: false });
      }

      if (!this.cleanText(this.form.controls.observaciones.value)) {
        this.form.controls.observaciones.setValue(this.buildOpportunityObservation(contexto), { emitEvent: false });
      }

      if (navigationCliente?.codigo) {
        this.loadOpportunityCliente(
          {
            ...contexto,
            codCliente: this.cleanText(navigationCliente.codigo),
            clienteNombre: this.cleanText(navigationCliente.nombre) || contexto.clienteNombre
          },
          oportunidadId
        );
        return;
      }

      if (navigationCliente) {
        this.applySelectedCliente(navigationCliente);
        this.setClienteEditable(false);
        return;
      }

      if (contexto.codCliente) {
        this.loadOpportunityCliente(contexto, oportunidadId);
        return;
      }

      this.oportunidadService
        .getById(oportunidadId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (oportunidad) => {
            if (!oportunidad || this.oportunidadContexto?.oportunidadId !== oportunidadId) {
              return;
            }

            this.oportunidadContexto = {
              ...this.oportunidadContexto,
              codCliente: oportunidad.codCliente,
              clienteNombre: oportunidad.clienteNombre || this.oportunidadContexto.clienteNombre,
              codVendedor: oportunidad.vendedor || this.oportunidadContexto.codVendedor,
              titulo: oportunidad.titulo || this.oportunidadContexto.titulo,
              descripcion: oportunidad.descripcion || this.oportunidadContexto.descripcion,
              etapaActual: oportunidad.etapa || this.oportunidadContexto.etapaActual
            };

            if (this.oportunidadContexto.codVendedor) {
              this.form.controls.codVendedor.setValue(this.oportunidadContexto.codVendedor, { emitEvent: false });
            }

            if (this.cleanText(this.form.controls.observaciones.value) === this.buildOpportunityObservation(contexto)) {
              this.form.controls.observaciones.setValue(this.buildOpportunityObservation(this.oportunidadContexto), { emitEvent: false });
            }

            this.loadOpportunityCliente(this.oportunidadContexto, oportunidadId);
          }
        });
    });
  }

  private initClienteFromQuery(): void {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      if (this.isEditingExistingOrder || this.modoOportunidad || this.modoReserva || this.isSubmitting) {
        return;
      }

      if (this.originComponent === 'oportunidad-form') {
        return;
      }

      const codCliente = this.cleanText(params.get('codCliente'));
      const clienteNombre = this.cleanText(params.get('clienteNombre'));
      const tipNDP = this.cleanText(params.get('tipNDP')).toUpperCase();

      if (tipNDP === 'COT' || tipNDP === 'NDP') {
        this.form.controls.tipNDP.setValue(tipNDP, { emitEvent: false });
      }

      if (!codCliente) {
        if (clienteNombre && !this.cleanText(this.form.controls.nomCliente.value)) {
          this.form.controls.nomCliente.setValue(clienteNombre, { emitEvent: false });
        }
        return;
      }

      if (this.selectedCliente?.codigo === codCliente) {
        return;
      }

      this.clienteService
        .getClienteByCodigo(codCliente)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (cliente) => {
            if (cliente) {
              this.applySelectedCliente(cliente);
              return;
            }

            this.form.patchValue(
              {
                codCliente,
                nomCliente: clienteNombre || codCliente
              },
              { emitEvent: false }
            );
          },
          error: () => {
            this.form.patchValue(
              {
                codCliente,
                nomCliente: clienteNombre || codCliente
              },
              { emitEvent: false }
            );
          }
        });
    });
  }

  private loadOpportunityCliente(contexto: OportunidadCotizacionContext, oportunidadId: number): void {
    this.clienteService
      .getClienteByCodigo(contexto.codCliente)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (cliente) => {
          if (this.oportunidadContexto?.oportunidadId !== oportunidadId) {
            return;
          }

          if (cliente) {
            this.applySelectedCliente(cliente);
          } else {
            this.selectedCliente = null;
            this.clienteCorreo = '';
            this.clienteCodigoActividad = '';
            this.clienteActividadLoading = false;
            this.clienteActividadCedula = '';
            this.form.patchValue(
              {
                codCliente: contexto.codCliente,
                nomCliente: contexto.clienteNombre || contexto.codCliente,
                rucCliente: ''
              },
              { emitEvent: false }
            );
          }

          this.setClienteEditable(false);
        },
        error: () => {
          if (this.oportunidadContexto?.oportunidadId !== oportunidadId) {
            return;
          }

          this.selectedCliente = null;
          this.clienteCorreo = '';
          this.clienteCodigoActividad = '';
          this.clienteActividadLoading = false;
          this.clienteActividadCedula = '';
          this.form.patchValue(
            {
              codCliente: contexto.codCliente,
              nomCliente: contexto.clienteNombre || contexto.codCliente,
              rucCliente: ''
            },
            { emitEvent: false }
          );
          this.setClienteEditable(false);
        }
      });
  }

  private setClienteEditable(enabled: boolean): void {
    const controls = [this.form.controls.codCliente, this.form.controls.nomCliente];

    controls.forEach((control) => {
      if (enabled && control.disabled) {
        control.enable({ emitEvent: false });
      }
      if (!enabled && control.enabled) {
        control.disable({ emitEvent: false });
      }
    });
  }

  private setTipoDocumentoEditable(enabled: boolean): void {
    const control = this.form.controls.tipNDP;
    if (enabled && control.disabled) {
      control.enable({ emitEvent: false });
    }
    if (!enabled && control.enabled) {
      control.disable({ emitEvent: false });
    }
  }

  private setListaPrecioEditable(enabled: boolean): void {
    const control = this.form.controls.listaPrecio;
    if (enabled && control.disabled) {
      control.enable({ emitEvent: false });
    }
    if (!enabled && control.enabled) {
      control.disable({ emitEvent: false });
    }
  }

  private setPlanTarifarioEditable(enabled: boolean): void {
    const control = this.form.controls.planTarifario;
    if (enabled && control.disabled) {
      control.enable({ emitEvent: false });
    }
    if (!enabled && control.enabled) {
      control.disable({ emitEvent: false });
    }
  }

  private applyPuntosVentaCatalogo(puntosVenta: PuntoVentaUI[]): void {
    this.puntosVentaCatalogo = puntosVenta;

    const current = this.form.controls.pntVenta.value;
    const exists = puntosVenta.some((item) => item.codigo === current);
    if (!current || !exists) {
      this.form.controls.pntVenta.setValue(puntosVenta[0]?.codigo ?? '', { emitEvent: false });
    }
  }

  private calculateExoneracion(impuestoBruto: number): number {
    if (!this.form.controls.exoneracionActiva.value) {
      return 0;
    }

    const exoneracionForm = this.form.controls.exoneracion;
    const tarifa = this.toNumber(exoneracionForm.controls.tarifaExonerada.value);
    const montoManual = this.toNumber(exoneracionForm.controls.montoExoneracion.value);
    const montoCalculado = impuestoBruto * (tarifa / 100);
    const monto = montoManual > 0 ? montoManual : montoCalculado;

    exoneracionForm.controls.montoExoneracion.setValue(this.round(monto), { emitEvent: false });
    return this.round(monto);
  }

  private syncDetalleCatalogCodes(): void {
    if (this.modoReserva) {
      return;
    }

    const lstPrecio = (this.form.controls.listaPrecio.value || '').toString();
    const planTarifa = (this.form.controls.planTarifario.value || '').toString();

    this.detalleArray.controls.forEach((group) => {
      if (String(group.get('lstPrecio')?.value ?? '') !== lstPrecio) {
        group.get('lstPrecio')?.setValue(lstPrecio, { emitEvent: false });
      }
      if (String(group.get('planTarifa')?.value ?? '') !== planTarifa) {
        group.get('planTarifa')?.setValue(planTarifa, { emitEvent: false });
      }
    });
  }

  private loadClienteActividad(cedula: string): void {
    const cedulaNormalizada = String(cedula ?? '').trim();
    this.clienteActividadCedula = cedulaNormalizada;
    this.clienteCodigoActividad = '';

    if (!cedulaNormalizada) {
      this.clienteActividadLoading = false;
      return;
    }

    this.clienteActividadLoading = true;
    this.actividadComercialService
      .getActividades(cedulaNormalizada)
      .pipe(
        finalize(() => {
          this.clienteActividadLoading = false;
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (actividades) => {
          if (this.clienteActividadCedula !== cedulaNormalizada) {
            return;
          }
          const actividadPrincipal =
            (actividades ?? []).find((item) => Number(item.MPV32_Principal) === 1) ??
            (actividades ?? [])[0] ??
            null;
          this.clienteCodigoActividad = actividadPrincipal?.MPV32_CodigoAMH ?? '';
        },
        error: () => {
          if (this.clienteActividadCedula === cedulaNormalizada) {
            this.clienteCodigoActividad = '';
          }
        }
      });
  }

  private buildPayload(): OrdenPedidoCreatePayload {
    const moneda = this.cleanText(this.form.controls.moneda.value);
    const tCambio = this.getHeaderTipoCambio();
    const detalle = this.buildDetallePayload(moneda, tCambio);
    const formasPago = this.pagosArray.getRawValue().map((item, index) => this.mapPago(item as Record<string, unknown>, index + 1));
    const exento = this.form.controls.exoneracionActiva.value ? 1 : 0;
    const fecVenc = formasPago[0]?.vencimiento || this.formatDateForApi(this.form.controls.fecNDP.value);
    const referencia ='';

    return {
      proceso: this.isEditingExistingOrder ? 0 : 1,
      detalle,
      formasPago,
      tipNDP: this.documentoEdicionContext?.tipNDP || this.form.controls.tipNDP.value,
      serieNDP: this.documentoEdicionContext?.serieNDP || '',
      numeroNDP: this.documentoEdicionContext?.numNDP || '',
      pntVenta: this.form.controls.pntVenta.value,
      fecNDP: this.formatDateForApi(this.form.controls.fecNDP.value),
      horaNDP: this.form.controls.horaNDP.value,
      codVendedor: this.form.controls.codVendedor.value,
      codCliente: this.form.controls.codCliente.value,
      rucCliente: this.form.controls.rucCliente.value,
      nomCliente: this.form.controls.nomCliente.value,
      exento,
      subTotal: this.round(this.form.controls.subTotal.value),
      impuesto: this.round(this.form.controls.impuesto.value),
      totDocu: this.round(this.form.controls.totDocu.value),
      totalPago: this.round(this.form.controls.totalPago.value),
      estadoNDP: this.documentoEdicionContext?.estadoNDP || 'ABI',
      moneda,
      tCambio,
      fecVenc,
      lstPrecio: this.cleanText(this.form.controls.listaPrecio.value),
      items: detalle.length,
      nReferencia: referencia,
      observaciones: this.form.controls.observaciones.value,
      operador: this.getOperador(),
      idBeep: '',
      cActividad: this.clienteCodigoActividad,
      pageNumber: 1,
      pageSize: 10,
      respuesta: '',
      exoneraciones: this.buildExoneracionesPayload()
    };
  }

  private buildDetallePayload(moneda: string, tCambio: number): OrdenPedidoDetalleItem[] {
    const detalleRaw = this.detalleArray.getRawValue().map((item) => item as Record<string, unknown>);
    const exoneracionTarifa = this.getExoneracionRate();
    const lineas = detalleRaw.map((item) => {
      const canProdu = this.toNumber(item['canProdu']);
      const pUndLst = this.round(this.toNumber(item['pUndLst']));
      const porDescu = this.toNumber(item['porDescu']);
      const porImpu = this.toNumber(item['porImpu']);
      const totSinImp = this.round(canProdu * pUndLst);
      const mtoDescu = this.round(totSinImp * (porDescu / 100));
      const totalNeto = this.round(totSinImp - mtoDescu);
      const mtoImpuBruto = this.round(totalNeto * (porImpu / 100));

      return {
        item,
        canProdu,
        pUndLst,
        porDescu,
        porImpu,
        totSinImp,
        mtoDescu,
        totalNeto,
        mtoImpuBruto
      };
    });

    const totalImpuestoBruto = this.round(lineas.reduce((acc, linea) => acc + linea.mtoImpuBruto, 0));
    const exoneracionTotal = this.form.controls.exoneracionActiva.value ? this.calculateExoneracion(totalImpuestoBruto) : 0;
    let exoneracionRestante = exoneracionTotal;

    return lineas.map((linea, index) => {
      const isLast = index === lineas.length - 1;
      const proporcion = totalImpuestoBruto > 0 ? linea.mtoImpuBruto / totalImpuestoBruto : 0;
      const mtoExonera =
        exoneracionTotal > 0
          ? this.round(isLast ? exoneracionRestante : exoneracionTotal * proporcion)
          : 0;

      exoneracionRestante = this.round(Math.max(exoneracionRestante - mtoExonera, 0));

      const mtoImpu = this.round(Math.max(linea.mtoImpuBruto - mtoExonera, 0));
      const mtoTotal = this.round(linea.totalNeto + mtoImpu);
      const uniConImp = linea.canProdu > 0 ? this.round(mtoTotal / linea.canProdu) : this.round(linea.pUndLst);
      const raw = linea.item;

      return {
        codProdu: this.cleanText(raw['codProdu']),
        producto: this.cleanText(raw['producto']),
        area: this.cleanText(raw['area']) || 'TOURS',
        uMedida: this.cleanText(raw['uMedida']) || 'Unid',
        canProdu: linea.canProdu,
        pUndLst: linea.pUndLst,
        uniSinImp: linea.pUndLst,
        totSinImp: linea.totSinImp,
        porDescu: linea.porDescu,
        mtoDescu: linea.mtoDescu,
        totalNeto: linea.totalNeto,
        porImpu: linea.porImpu,
        mtoImpu,
        porExonera: exoneracionTarifa,
        mtoExonera,
        uniConImp,
        mtoTotal,
        grabado: linea.porImpu > 0 ? 'G' : 'E',
        moneda,
        tCambio,
        orden: index + 1,
        uMedidaDos: '',
        canProduDos: 0,
        lstPrecio: this.cleanText(raw['lstPrecio']) || this.cleanText(this.form.controls.listaPrecio.value),
        planTarifa: this.cleanText(raw['planTarifa']) || this.cleanText(this.form.controls.planTarifario.value)
      };
    });
  }

  private mapPago(item: Record<string, unknown>, orden: number): OrdenPedidoPagoItem {
    const frmPago = this.cleanText(item['frmPago']);
    const formaPago = this.formasPagoCatalogo.find((entry) => entry.codigo === frmPago);
    const monto = this.round(this.toNumber(item['monto']));
    const tCambio = this.toNumber(item['tCambio']) || 1;

    return {
      orden,
      frmPago,
      tipo: this.cleanText(item['tipo']) || formaPago?.tipoPago || '',
      numTarjeta: this.cleanText(item['numTarjeta']),
      referencia: this.cleanText(item['referencia']),
      moneda: this.cleanText(item['moneda']) || this.cleanText(this.form.controls.moneda.value),
      monto,
      montoOri: this.round(this.toNumber(item['montoOri']) || monto),
      tCambio,
      vencimiento: this.cleanText(item['vencimiento']) || this.calculatePagoVencimiento(frmPago),
      caja: this.cleanText(item['caja']),
      turno: this.cleanText(item['turno'])
    };
  }

  private mapExoneracion(): OrdenPedidoExoneracion {
    const ex = this.form.controls.exoneracion.getRawValue();
    return {
      tipoDocumentoEX1: ex.tipoDocumentoEX1,
      numeroDocumento: ex.numeroDocumento,
      nombreInstitucion: ex.nombreInstitucion,
      tarifaExonerada: this.toNumber(ex.tarifaExonerada),
      montoExoneracion: this.toNumber(ex.montoExoneracion)
    };
  }

  private buildExoneracionesPayload(): OrdenPedidoExoneracionUpdate[] {
    if (!this.form.controls.exoneracionActiva.value) {
      return [];
    }

    const ex = this.mapExoneracion();
    return [
      {
        tipoDocumentoEX1: ex.tipoDocumentoEX1,
        tipoDocumentoOTRO: '',
        numeroDocumento: ex.numeroDocumento,
        articulo: '',
        inciso: '',
        nombreInstitucion: ex.nombreInstitucion,
        nombreInstitucionOtros: '',
        fechaEmisionEX: '',
        tarifaExonerada: ex.tarifaExonerada,
        montoExoneracion: ex.montoExoneracion
      }
    ];
  }

  private getNumeroDocumentoForUpdate(contexto: DocumentoEdicionContext): string {
    const serie = this.cleanText(contexto.serieNDP);
    const numero = this.cleanText(contexto.numNDP);

    if (!numero) {
      return serie;
    }

    if (!serie || numero.includes('-')) {
      return numero;
    }

    return `${serie}-${numero}`;
  }

  private toNumber(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private cleanText(value: unknown): string {
    return String(value ?? '').trim();
  }

  private normalizeReturnUrl(value: string): string {
    const url = this.cleanText(value);
    if (!url) {
      return '';
    }
    return url.startsWith('/') ? url : '';
  }

  private syncPagosMoneda(moneda: string): void {
    const selectedMoneda = String(moneda ?? '').trim();
    if (!selectedMoneda) {
      return;
    }

    this.pagosArray.controls.forEach((group) => {
      group.controls['moneda'].setValue(selectedMoneda, { emitEvent: false });
    });
  }

  private round(value: number): number {
    return Number(value.toFixed(2));
  }

  private getHeaderTipoCambio(): number {
    const firstPago = this.pagosArray.controls[0];
    const tCambio = this.toNumber(firstPago?.get('tCambio')?.value);
    return tCambio > 0 ? tCambio : 1;
  }

  private getExoneracionRate(): number {
    if (!this.form.controls.exoneracionActiva.value) {
      return 0;
    }

    const impuestoBruto = this.detalleArray.controls.reduce((acc, group) => acc + this.toNumber(group.get('mtoImpu')?.value), 0);
    if (impuestoBruto <= 0) {
      return 0;
    }

    const tarifa = this.toNumber(this.form.controls.exoneracion.controls.tarifaExonerada.value);
    if (tarifa > 0) {
      return this.round(tarifa);
    }

    const monto = this.toNumber(this.form.controls.exoneracion.controls.montoExoneracion.value);
    return this.round((monto / impuestoBruto) * 100);
  }

  private calculatePagoVencimiento(frmPago: string): string {
    const fechaBase = this.cleanText(this.form.controls.fecNDP.value);
    if (!fechaBase) {
      return '';
    }

    const formaPago = this.formasPagoCatalogo.find((item) => item.codigo === frmPago);
    const dias = Number(formaPago?.nDias ?? 0) || 0;
    const parsedDate = this.parseDateValue(fechaBase);
    if (!parsedDate) {
      return this.formatDateForApi(fechaBase);
    }

    parsedDate.setDate(parsedDate.getDate() + dias);
    return this.formatDateForApi(
      `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, '0')}-${String(parsedDate.getDate()).padStart(2, '0')}`
    );
  }

  private parseDateValue(value: string): Date | null {
    const raw = this.cleanText(value);
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      const [year, month, day] = raw.split('-').map((part) => Number(part));
      return new Date(year, month - 1, day);
    }
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
      const [day, month, year] = raw.split('/').map((part) => Number(part));
      return new Date(year, month - 1, day);
    }
    return null;
  }

  private getOperador(): string {
    const currentUser = this.authService.getCurrentUser();
    return this.cleanText(currentUser?.usuario) || this.cleanText(this.form.controls.codVendedor.value);
  }

  private buildOpportunityObservation(contexto: OportunidadCotizacionContext): string {
    const titulo = this.cleanText(contexto.titulo);
    const descripcion = this.cleanText(contexto.descripcion);
    const lineas = [`Cotizacion asociada a oportunidad #${contexto.oportunidadId}.`];

    if (titulo) {
      lineas.push(`Titulo: ${titulo}`);
    }
    if (descripcion) {
      lineas.push(`Contexto: ${descripcion}`);
    }

    return lineas.join(' ');
  }

  private syncOportunidadCotizacion(response: OrdenPedidoCreateResponse): Observable<OportunidadPostCreateResult | null> {
    if (this.isEditingExistingOrder) {
      return of(null);
    }

    if (!this.modoOportunidad || !this.oportunidadContexto) {
      return of(null);
    }

    const data = response?.datos?.[0];
    const tipNDP = this.cleanText(data?.TipNDP);
    const serieNDP = this.cleanText(data?.Serie);
    const numNDP = this.cleanText(data?.NumNDP);

    if (!tipNDP || !serieNDP || !numNDP) {
      return of({
        partial: true,
        message: 'La cotizacion se creo, pero el API no devolvio el identificador documental para vincularla a la oportunidad.'
      } satisfies OportunidadPostCreateResult);
    }

    return this.oportunidadService
      .vincularCotizacion(this.oportunidadContexto.oportunidadId, { tipNDP, serieNDP, numNDP })
      .pipe(
        switchMap(() => {
          if (this.oportunidadContexto?.etapaActual !== 'PROSPECTO') {
            return of(null);
          }
          return this.oportunidadService.changeStage(this.oportunidadContexto.oportunidadId, 'COTIZACION');
        }),
        map(
          () =>
            ({
              partial: false,
              message: `Cotizacion vinculada a la oportunidad #${this.oportunidadContexto?.oportunidadId}.`
            }) satisfies OportunidadPostCreateResult
        ),
        catchError((error) => {
          console.error('Error al vincular la cotizacion con la oportunidad:', error);
          return of({
            partial: true,
            message: 'La cotizacion se creo correctamente, pero no se pudo vincular automaticamente con la oportunidad.'
          } satisfies OportunidadPostCreateResult);
        })
      );
  }

  private buildCreateSuccessMessage(
    response: { mensaje?: string; respuesta?: string; datos?: Array<{ TipNDP?: string; Serie?: string; NumNDP?: string }> },
    extraMessage?: string
  ): string {
    const data = response?.datos?.[0];
    const tipNDP = this.cleanText(data?.TipNDP);
    const serie = this.cleanText(data?.Serie);
    const numNDP = this.cleanText(data?.NumNDP);
    const identificador = [tipNDP, serie, numNDP].filter(Boolean).join(' ');
    const baseMessage =
      this.cleanText(response?.mensaje) ||
      this.cleanText(response?.respuesta) ||
      (this.isEditingExistingOrder ? 'La orden fue actualizada correctamente.' : 'La orden fue creada correctamente.');
    const finalMessage = extraMessage ? `${baseMessage}\n${extraMessage}` : baseMessage;

    return identificador ? `${finalMessage}\nDocumento: ${identificador}` : finalMessage;
  }

  private buildOrderReturnInfo(
    response: { datos?: Array<{ TipNDP?: string; Serie?: string; NumNDP?: string; DocuReferencia?: string }> } | null,
    payload: OrdenPedidoCreatePayload
  ): OrdenPedidoReturnInfo {
    const data = response?.datos?.[0];
    let tipOrden = this.cleanText(data?.TipNDP) || this.cleanText(payload.tipNDP);
    let serie = this.cleanText(data?.Serie);
    let numero = this.cleanText(data?.NumNDP);

    // Si viene un DocuReferencia combinado (ej: "COT 000 002-0000011665"), parsearlo
    const docuRef = this.cleanText(data?.DocuReferencia);
    if (docuRef && (!serie || !numero)) {
      const parsed = this.ordenPedidoService.parseQuotationFormat(docuRef);
      if (parsed.tipNDP) tipOrden = parsed.tipNDP;
      if (parsed.serie) serie = parsed.serie;
      if (parsed.numero) numero = parsed.numero;
    }

    return {
      total: this.toNumber(payload.totDocu),
      tipOrden,
      serie,
      numero
    };
  }

  private formatDateForApi(value: string): string {
    const raw = String(value ?? '').trim();
    if (!raw) {
      return '';
    }
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
      return raw;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      const [year, month, day] = raw.split('-');
      return `${day}/${month}/${year}`;
    }
    return raw;
  }

  private getTodayIsoDate(): string {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }

  private getCurrentTime(): string {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }
}
