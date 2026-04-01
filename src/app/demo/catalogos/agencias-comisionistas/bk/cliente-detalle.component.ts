import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { OrdenPedidoListadoItem } from '../../orden-pedido/interfaces/orden-pedido.interface';
import { OrdenPedidoService } from '../../orden-pedido/services/orden-pedido.service';
import { OPORTUNIDAD_ETAPAS, OportunidadEtapa, OportunidadUI } from '../../crm/oportunidades/oportunidad.models';
import { OportunidadService } from '../../crm/oportunidades/oportunidad.service';
import { ClienteContactoUI, ClienteUI } from './cliente.models';
import { ClienteService } from './cliente.service';

type ClienteDetalleTab = 'resumen' | 'oportunidades' | 'pipeline' | 'cotizaciones' | 'pedidos';

type ClientePipelineColumn = {
  etapa: OportunidadEtapa;
  items: OportunidadUI[];
  total: number;
};

@Component({
  selector: 'app-cliente-detalle',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cliente-detalle.component.html',
  styleUrl: './cliente-detalle.component.scss'
})
export class ClienteDetalleComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private clienteService = inject(ClienteService);
  private oportunidadService = inject(OportunidadService);
  private ordenPedidoService = inject(OrdenPedidoService);
  private destroyRef = inject(DestroyRef);
  private readonly avatarStyleCache = new Map<string, Record<string, string>>();

  readonly tabs: Array<{ id: ClienteDetalleTab; label: string }> = [
    { id: 'resumen', label: 'Resumen' },
    { id: 'oportunidades', label: 'Oportunidades' },
    { id: 'pipeline', label: 'Pipeline' },
    { id: 'cotizaciones', label: 'Cotizaciones' },
    { id: 'pedidos', label: 'Pedidos' }
  ];
  readonly documentDatePresets = [
    { id: 'year', label: 'Este año' },
    { id: 'last90', label: 'Últimos 90 días' },
    { id: 'custom', label: 'Personalizado' }
  ] as const;

  cliente: ClienteUI | null = null;
  oportunidades: OportunidadUI[] = [];
  cotizaciones: OrdenPedidoListadoItem[] = [];
  pedidos: OrdenPedidoListadoItem[] = [];
  activeTab: ClienteDetalleTab = 'resumen';
  isLoading = false;
  isLoadingOportunidades = false;
  isLoadingCotizaciones = false;
  isLoadingPedidos = false;
  loadError = '';
  oportunidadesError = '';
  cotizacionesError = '';
  pedidosError = '';
  currentClienteId = '';
  documentDatePreset: 'year' | 'last90' | 'custom' = 'year';
  documentDateFromInput = '';
  documentDateToInput = '';

  ngOnInit(): void {
    this.setDefaultDocumentDateRange();
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const id = params.get('id')?.trim() ?? '';
      this.currentClienteId = id;
      this.activeTab = 'resumen';
      this.loadCliente(id);
    });
  }

  get contactos(): ClienteContactoUI[] {
    return this.cliente?.contactos ?? [];
  }

  get contactoPrincipal(): ClienteContactoUI | null {
    return this.contactos.find((item) => item.principal) ?? this.contactos[0] ?? null;
  }

  get totalContactos(): number {
    return this.cliente?.totalContactos ?? this.contactos.length;
  }

  get totalOportunidades(): number {
    return this.oportunidades.length;
  }

  get totalPipeline(): number {
    return this.oportunidades.reduce((acc, item) => acc + (item.montoEstimado || 0), 0);
  }

  get oportunidadesActivas(): number {
    return this.oportunidades.filter((item) => !['GANADO', 'PERDIDO'].includes(item.etapa)).length;
  }

  get oportunidadesGanadas(): number {
    return this.oportunidades.filter((item) => item.etapa === 'GANADO').length;
  }

  get oportunidadesPerdidas(): number {
    return this.oportunidades.filter((item) => item.etapa === 'PERDIDO').length;
  }

  get pipelineColumns(): ClientePipelineColumn[] {
    return OPORTUNIDAD_ETAPAS.map((etapa) => {
      const items = this.oportunidades.filter((item) => item.etapa === etapa);
      return {
        etapa,
        items,
        total: items.reduce((acc, item) => acc + (item.montoEstimado || 0), 0)
      };
    });
  }

  get hasCommercialDocuments(): boolean {
    return this.cotizaciones.length > 0 || this.pedidos.length > 0;
  }

  loadCliente(id: string): void {
    if (!id) {
      this.cliente = null;
      this.loadError = 'No se proporcionó un identificador de cliente válido.';
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    this.loadError = '';
    this.cliente = null;
    this.cotizaciones = [];
    this.pedidos = [];
    this.cotizacionesError = '';
    this.pedidosError = '';
    this.loadOportunidades(id);

    this.clienteService.getClienteByCodigo(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (cliente) => {
        this.cliente = cliente;
        this.loadError = cliente ? '' : 'No se encontró información para el cliente solicitado.';
        this.isLoading = false;
        if (cliente) {
          this.loadCommercialDocuments(cliente);
        }
      },
      error: (error) => {
        console.error('Error al cargar detalle del cliente:', error);
        this.loadError = 'No se pudo cargar el detalle del cliente. Verifique la conexión con el API.';
        this.isLoading = false;
      }
    });
  }

  setActiveTab(tab: ClienteDetalleTab): void {
    this.activeTab = tab;
  }

  goBack(): void {
    this.router.navigate(['/crm/contactos']);
  }

  retryLoad(): void {
    this.loadCliente(this.currentClienteId);
  }

  setDocumentDatePreset(preset: 'year' | 'last90' | 'custom'): void {
    this.documentDatePreset = preset;
    if (preset === 'year') {
      const now = new Date();
      this.documentDateFromInput = this.formatDateInput(new Date(now.getFullYear(), 0, 1));
      this.documentDateToInput = this.formatDateInput(now);
      this.reloadCommercialDocuments();
      return;
    }

    if (preset === 'last90') {
      const now = new Date();
      const from = new Date(now);
      from.setDate(now.getDate() - 89);
      this.documentDateFromInput = this.formatDateInput(from);
      this.documentDateToInput = this.formatDateInput(now);
      this.reloadCommercialDocuments();
    }
  }

  applyCustomDocumentRange(): void {
    if (!this.documentDateFromInput || !this.documentDateToInput) {
      return;
    }

    if (this.documentDateFromInput > this.documentDateToInput) {
      this.cotizacionesError = 'La fecha inicial no puede ser mayor que la fecha final.';
      this.pedidosError = this.cotizacionesError;
      return;
    }

    this.cotizacionesError = '';
    this.pedidosError = '';
    this.reloadCommercialDocuments();
  }

  openEdit(): void {
    if (!this.cliente?.codigo) {
      return;
    }
    this.router.navigate(['/catalogos/clientes', this.cliente.codigo, 'editar']);
  }

  openCreateOpportunity(): void {
    if (!this.cliente?.codigo) {
      return;
    }
    this.router.navigate(['/crm/oportunidades/nueva'], {
      queryParams: {
        cliente: this.cliente.codigo,
        clienteNombre: this.cliente.nombre
      }
    });
  }

  openCreateQuotation(): void {
    if (!this.cliente?.codigo) {
      this.router.navigate(['/demo/ordenes-pedido/nuevo']);
      return;
    }

    this.router.navigate(['/demo/ordenes-pedido/nuevo'], {
      queryParams: {
        tipNDP: 'COT',
        codCliente: this.cliente.codigo,
        clienteNombre: this.cliente.nombre
      }
    });
  }

  openOpportunityDetail(oportunidad: OportunidadUI): void {
    if (!oportunidad.id) {
      return;
    }
    this.router.navigate(['/crm/oportunidades', oportunidad.id]);
  }

  openOpportunityEdit(oportunidad: OportunidadUI): void {
    if (!oportunidad.id) {
      return;
    }
    this.router.navigate(['/crm/oportunidades', oportunidad.id, 'editar']);
  }

  openOpportunityQuotation(oportunidad: OportunidadUI): void {
    if (!oportunidad.id) {
      return;
    }

    if (oportunidad.tieneCotizacion) {
      this.router.navigate(['/demo/ordenes-pedido'], {
        queryParams: {
          tipOrden: oportunidad.tipNDP || 'COT',
          nomCliente: oportunidad.clienteNombre || this.cliente?.nombre || '',
          serie: oportunidad.serieNDP || '',
          numero: oportunidad.numNDP || ''
        }
      });
      return;
    }

    this.router.navigate(['/crm/oportunidades', oportunidad.id, 'cotizacion'], {
      queryParams: {
        oportunidadId: oportunidad.id,
        codCliente: oportunidad.codCliente,
        clienteNombre: oportunidad.clienteNombre,
        codVendedor: oportunidad.vendedor,
        titulo: oportunidad.titulo,
        descripcion: oportunidad.descripcion,
        etapaActual: oportunidad.etapa
      }
    });
  }

  openPipeline(stage?: OportunidadEtapa): void {
    this.router.navigate(['/crm/pipeline'], {
      queryParams: {
        busqueda: this.cliente?.nombre || undefined,
        etapa: stage || undefined
      }
    });
  }

  openDocumento(documento: OrdenPedidoListadoItem): void {
    this.router.navigate(['/demo/ordenes-pedido'], {
      queryParams: {
        tipOrden: documento.tipOrden || 'NDP',
        nomCliente: documento.cliente || this.cliente?.nombre || '',
        serie: documento.serie || '',
        numero: documento.numero || ''
      }
    });
  }

  getTipoLabel(tipo: string, subtipo: string): string {
    const normalizedSubtipo = this.normalizeCodigo(subtipo);
    const normalizedTipo = this.normalizeCodigo(tipo);

    if (normalizedSubtipo === 'DET') return 'Detallista';
    if (normalizedSubtipo === 'MAY') return 'Mayorista';
    if (normalizedTipo === 'AGE') return 'Agencia';
    if (normalizedTipo === 'CLI') return 'Cliente';
    return normalizedSubtipo || normalizedTipo || 'Sin tipo';
  }

  getTipoClass(tipo: string, subtipo: string): string {
    const normalizedSubtipo = this.normalizeCodigo(subtipo);
    const normalizedTipo = this.normalizeCodigo(tipo);

    if (normalizedSubtipo === 'DET') return 'cliente-detalle-badge--detallista';
    if (normalizedSubtipo === 'MAY') return 'cliente-detalle-badge--mayorista';
    if (normalizedTipo === 'AGE') return 'cliente-detalle-badge--agencia';
    if (normalizedTipo === 'CLI') return 'cliente-detalle-badge--cliente';
    return 'cliente-detalle-badge--default';
  }

  getUbicacion(): string {
    const provincia = this.cliente?.provincia?.trim();
    const ciudad = this.cliente?.ciudad?.trim();
    const pais = this.cliente?.pais?.trim();
    if (provincia && ciudad) return `${provincia} / ${ciudad}`;
    if (provincia || ciudad) return provincia || ciudad || 'Ubicación no disponible';
    return pais || 'Ubicación no disponible';
  }

  getAvatarInitials(): string {
    const nombre = this.cliente?.nombre ?? '';
    const initials = nombre
      .split(' ')
      .map((part) => part.trim())
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
    return initials || 'CR';
  }

  getAvatarStyle(): Record<string, string> {
    const cacheKey = this.cliente?.nombre || this.cliente?.codigo || 'crm-detalle';
    const cached = this.avatarStyleCache.get(cacheKey);
    if (cached) return cached;

    const hash = Array.from(cacheKey).reduce((acc, char) => acc + char.charCodeAt(0) * 19, 0);
    const hue = hash % 360;
    const style = {
      background: `linear-gradient(135deg, hsl(${hue} 66% 56%) 0%, hsl(${(hue + 28) % 360} 60% 46%) 100%)`,
      color: '#ffffff',
      boxShadow: `0 16px 30px hsla(${hue} 72% 42% / 0.22)`
    };

    this.avatarStyleCache.set(cacheKey, style);
    return style;
  }

  getContactoTelefono(contacto: ClienteContactoUI): string {
    return contacto.telefono1 || contacto.movil || contacto.telefono2 || 'Sin teléfono';
  }

  getOpportunityStageClass(etapa: string): string {
    const normalized = (etapa || 'PROSPECTO').trim().toLowerCase();
    return `cliente-detalle-badge--stage-${normalized}`;
  }

  getOpportunityStatusLabel(oportunidad: OportunidadUI): string {
    return oportunidad.tieneCotizacion ? 'Cotización vinculada' : 'Pendiente de cotizar';
  }

  getTabCount(tab: ClienteDetalleTab): number | null {
    if (tab === 'oportunidades') return this.oportunidades.length;
    if (tab === 'cotizaciones') return this.cotizaciones.length;
    if (tab === 'pedidos') return this.pedidos.length;
    return null;
  }

  getPipelineStageLabel(etapa: OportunidadEtapa): string {
    if (etapa === 'COTIZACION') return 'Cotización';
    if (etapa === 'NEGOCIACION') return 'Negociación';
    return etapa.charAt(0) + etapa.slice(1).toLowerCase();
  }

  getDocumentLabel(documento: OrdenPedidoListadoItem): string {
    return [documento.tipOrden, documento.serie, documento.numero].filter(Boolean).join(' ');
  }

  trackByContacto(index: number, contacto: ClienteContactoUI): string | number {
    return contacto.id || `${contacto.nomContacto}-${index}`;
  }

  trackByOportunidad(_index: number, oportunidad: OportunidadUI): number {
    return oportunidad.id;
  }

  trackByDocumento(_index: number, documento: OrdenPedidoListadoItem): string {
    return `${documento.tipOrden}-${documento.serie}-${documento.numero}`;
  }

  private loadOportunidades(codCliente: string): void {
    this.isLoadingOportunidades = true;
    this.oportunidadesError = '';
    this.oportunidades = [];

    this.oportunidadService
      .getByCliente(codCliente, 'A')
      .pipe(
        finalize(() => {
          this.isLoadingOportunidades = false;
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (oportunidades) => {
          this.oportunidades = oportunidades;
        },
        error: (error) => {
          console.error('Error al cargar oportunidades del cliente:', error);
          this.oportunidadesError = 'No se pudieron cargar las oportunidades relacionadas con este cliente.';
        }
      });
  }

  private loadCommercialDocuments(cliente: ClienteUI): void {
    const nomCliente = (cliente.nombre || '').trim();
    if (!nomCliente) {
      return;
    }

    const fechaDesde = this.toApiDate(this.documentDateFromInput) || this.getYearStartDate();
    const fechaHasta = this.toApiDate(this.documentDateToInput) || this.getTodayDate();

    this.isLoadingCotizaciones = true;
    this.isLoadingPedidos = true;
    this.cotizacionesError = '';
    this.pedidosError = '';

    forkJoin({
      cotizaciones: this.ordenPedidoService
        .getOrdenes({
          tipOrden: 'COT',
          fechaDesde,
          fechaHasta,
          nomCliente,
          pageNumber: 1,
          pageSize: 25
        })
        .pipe(catchError((error) => of({ datos: [], paginacion: { totalRegistros: 0, paginaActual: 1, pageSize: 25, totalPaginas: 1 }, error }))),
      pedidos: this.ordenPedidoService
        .getOrdenes({
          tipOrden: 'NDP',
          fechaDesde,
          fechaHasta,
          nomCliente,
          pageNumber: 1,
          pageSize: 25
        })
        .pipe(catchError((error) => of({ datos: [], paginacion: { totalRegistros: 0, paginaActual: 1, pageSize: 25, totalPaginas: 1 }, error })))
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ cotizaciones, pedidos }) => {
        this.cotizaciones = cotizaciones.datos ?? [];
        this.pedidos = pedidos.datos ?? [];
        this.isLoadingCotizaciones = false;
        this.isLoadingPedidos = false;

        const cotizacionesError = (cotizaciones as { error?: unknown }).error;
        const pedidosError = (pedidos as { error?: unknown }).error;

        if (cotizacionesError) {
          this.cotizacionesError = 'No se pudieron cargar las cotizaciones del cliente.';
        }
        if (pedidosError) {
          this.pedidosError = 'No se pudieron cargar los pedidos del cliente.';
        }
      });
  }

  private normalizeCodigo(value: string | null | undefined): string {
    return (value ?? '').toString().trim().toUpperCase();
  }

  private reloadCommercialDocuments(): void {
    if (!this.cliente) {
      return;
    }
    this.loadCommercialDocuments(this.cliente);
  }

  private getYearStartDate(): string {
    const now = new Date();
    return `01/01/${now.getFullYear()}`;
  }

  private getTodayDate(): string {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return `${day}/${month}/${year}`;
  }

  private setDefaultDocumentDateRange(): void {
    const now = new Date();
    this.documentDateFromInput = this.formatDateInput(new Date(now.getFullYear(), 0, 1));
    this.documentDateToInput = this.formatDateInput(now);
  }

  private formatDateInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private toApiDate(value: string): string {
    const raw = (value || '').trim();
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
}
