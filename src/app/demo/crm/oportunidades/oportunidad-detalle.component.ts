import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { of } from 'rxjs';
import { catchError, finalize, switchMap } from 'rxjs/operators';
import { ClienteContactoUI, ClienteUI } from 'src/app/demo/catalogos/agencias-comisionistas/cliente.models';
import { ClienteService } from 'src/app/demo/catalogos/agencias-comisionistas/cliente.service';
import { OrdenPedidoListadoItem } from 'src/app/demo/orden-pedido/interfaces/orden-pedido.interface';
import { OrdenPedidoService } from 'src/app/demo/orden-pedido/services/orden-pedido.service';
import { OPORTUNIDAD_ETAPAS, OportunidadEtapa, OportunidadUI } from './oportunidad.models';
import { OportunidadService } from './oportunidad.service';

@Component({
  selector: 'app-oportunidad-detalle',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './oportunidad-detalle.component.html',
  styleUrl: './oportunidad-detalle.component.scss'
})
export class OportunidadDetalleComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private oportunidadService = inject(OportunidadService);
  private clienteService = inject(ClienteService);
  private ordenPedidoService = inject(OrdenPedidoService);
  private readonly avatarStyleCache = new Map<string, Record<string, string>>();
  readonly etapas = OPORTUNIDAD_ETAPAS;

  isLoading                           = false;
  isLinkingCotizacion                 = false;
  isUpdatingStage                     = false;
  isUpdatingPriority                  = false;
  isClosingOpportunity                = false;
  isCotizacionModalOpen               = false;
  isSearchingCotizaciones             = false;
  loadError                           = '';
  linkError                           = '';
  linkSuccess                         = '';
  stageError                          = '';
  stageSuccess                         = '';
  cotizacionSearchError                = '';
  currentId                            = 0;
  oportunidad                          : OportunidadUI | null = null;
  cliente                              : ClienteUI | null = null;
  cotizacionResults                    : OrdenPedidoListadoItem[] = [];
  cotizacionSearchPageNumber           = 1;
  cotizacionSearchPageSize             = 10;
  cotizacionSearchTotalPages           = 1;
  cotizacionSearchTotalRecords         = 0;
  cotizacionForm = {
    tipNDP      : 'COT',
    serieNDP    : '',
    numNDP      : ''
  };
  selectedStage: OportunidadEtapa = 'PROSPECTO';
  cotizacionSearch = {
    tipOrden: 'COT',
    fechaDesde: this.getFirstDayOfYear(),
    fechaHasta: this.getTodayIsoDate(),
    codCliente: '',
    nomCliente: ''
  };

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const id = Number(params.get('id') ?? 0);
      this.currentId = id;
      this.loadOportunidad(id);
    });
  }

  get contactos(): ClienteContactoUI[] {
    return this.cliente?.contactos ?? [];
  }

  get cotizacionDocumento(): string {
    if (!this.oportunidad?.tieneCotizacion) {
      return 'Sin cotizacion vinculada';
    }

    return [this.oportunidad.tipNDP, this.oportunidad.serieNDP, this.oportunidad.numNDP].filter(Boolean).join(' ');
  }

  loadOportunidad(id: number): void {
    if (!id) {
      this.oportunidad = null;
      this.cliente = null;
      this.loadError = 'No se proporcionó un identificador de oportunidad válido.';
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    this.loadError = '';
    this.linkError = '';
    this.linkSuccess = '';
    this.stageError = '';
    this.stageSuccess = '';
    this.oportunidad = null;
    this.cliente = null;

    this.oportunidadService
      .getById(id)
      .pipe(
        switchMap((oportunidad) => {
          if (!oportunidad) {
            return of({ oportunidad: null, cliente: null });
          }

          return this.clienteService.getClienteByCodigo(oportunidad.codCliente).pipe(
            catchError((error) => {
              console.error('Error al cargar cliente asociado a la oportunidad:', error);
              return of(null);
            }),
            switchMap((cliente) => of({ oportunidad, cliente }))
          );
        }),
        finalize(() => {
          this.isLoading = false;
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: ({ oportunidad, cliente }) => {
          this.oportunidad = oportunidad;
          this.cliente = cliente;
          this.selectedStage = oportunidad?.etapa || 'PROSPECTO';
          this.cotizacionForm = {
            tipNDP: oportunidad?.tipNDP || 'COT',
            serieNDP: oportunidad?.serieNDP || '',
            numNDP: oportunidad?.numNDP || ''
          };
          this.cotizacionSearch = {
            tipOrden: oportunidad?.tipNDP || 'COT',
            fechaDesde: this.getFirstDayOfYear(),
            fechaHasta: this.getTodayIsoDate(),
            codCliente: oportunidad?.codCliente || '',
            nomCliente: oportunidad?.clienteNombre || ''
          };
          this.loadError = oportunidad ? '' : 'No se encontró información para la oportunidad solicitada.';
        },
        error: (error) => {
          console.error('Error al cargar detalle de oportunidad:', error);
          this.loadError = 'No se pudo cargar el detalle de la oportunidad. Verifique la conexión con el API.';
        }
      });
  }

  updateStage(): void {
    if (!this.oportunidad?.id) {
      return;
    }

    const nextStage = this.selectedStage;
    if (!nextStage) {
      this.stageSuccess = '';
      this.stageError = 'Seleccione una etapa válida.';
      return;
    }

    if (nextStage === this.oportunidad.etapa) {
      this.stageError = '';
      this.stageSuccess = 'La oportunidad ya se encuentra en esa etapa.';
      return;
    }

    this.isUpdatingStage = true;
    this.stageError = '';
    this.stageSuccess = '';

    this.oportunidadService
      .changeStage(this.oportunidad.id, nextStage)
      .pipe(
        finalize(() => {
          this.isUpdatingStage = false;
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response) => {
          if (this.oportunidad) {
            this.oportunidad = {
              ...this.oportunidad,
              etapa: nextStage
            };
          }
          this.stageSuccess = response?.mensaje || 'Etapa actualizada correctamente.';
        },
        error: (error) => {
          console.error('Error al actualizar etapa de oportunidad desde detalle:', error);
          this.selectedStage = this.oportunidad?.etapa || 'PROSPECTO';
          this.stageError = 'No se pudo actualizar la etapa de la oportunidad.';
        }
      });
  }

  goBack(): void {
    void this.router.navigate(['/crm/oportunidades']);
  }

  retryLoad(): void {
    this.loadOportunidad(this.currentId);
  }

  openEdit(): void {
    if (!this.oportunidad?.id) {
      return;
    }
    void this.router.navigate(['/crm/oportunidades', this.oportunidad.id, 'editar']);
  }

  openCliente(): void {
    if (!this.oportunidad?.codCliente) {
      return;
    }
    void this.router.navigate(['/crm/contactos', this.oportunidad.codCliente]);
  }

  openCotizacion(): void {
    if (!this.oportunidad) {
      return;
    }

    if (this.oportunidad.tieneCotizacion) {
      void this.router.navigate(['/crm/oportunidades', this.oportunidad.id, 'cotizacion'], {
        queryParams: {
          tipNDP: this.oportunidad.tipNDP || 'COT',
          serieNDP: this.oportunidad.serieNDP || '',
          numNDP: this.oportunidad.numNDP || '',
          mode: 'edit',
          origin: 'oportunidad-detalle',
          returnUrl: this.router.url,
          codCliente: this.oportunidad.codCliente || '',
          nomCliente: this.oportunidad.clienteNombre || '',
          codVendedor: this.oportunidad.vendedor || '',
          titulo: this.oportunidad.titulo || '',
          descripcion: this.oportunidad.descripcion || '',
          etapaActual: this.oportunidad.etapa || ''
        }
      });
      return;
    }

    void this.router.navigate(['/crm/oportunidades', this.oportunidad.id, 'cotizacion'], {
      queryParams: {
        oportunidadId: this.oportunidad.id,
        codCliente: this.oportunidad.codCliente,
        clienteNombre: this.oportunidad.clienteNombre,
        codVendedor: this.oportunidad.vendedor,
        titulo: this.oportunidad.titulo,
        descripcion: this.oportunidad.descripcion,
        etapaActual: this.oportunidad.etapa
      }
    });
  }

  openCotizacionDocumento(): void {
    if (!this.oportunidad?.tieneCotizacion) {
      return;
    }

    this.openCotizacion();
  }

  actualizarPrioridad(prioridad: 'Alta' | 'Media' | 'Baja'): void {
    if (!this.oportunidad?.id) {
      return;
    }

    this.isUpdatingPriority = true;
    this.stageError = '';
    this.stageSuccess = '';

    this.oportunidadService
      .actualizarPrioridad(this.oportunidad.id, prioridad)
      .pipe(
        finalize(() => {
          this.isUpdatingPriority = false;
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response) => {
          if (this.oportunidad) {
            this.oportunidad = {
              ...this.oportunidad,
              prioridad
            };
          }
          this.stageSuccess = response?.mensaje || `Prioridad actualizada a ${prioridad}.`;
        },
        error: (error) => {
          console.error('Error al actualizar prioridad desde detalle:', error);
          this.stageError = 'No se pudo actualizar la prioridad de la oportunidad.';
        }
      });
  }

  cerrarOportunidad(etapa: 'Ganada' | 'Perdida'): void {
    if (!this.oportunidad?.id) {
      return;
    }

    this.isClosingOpportunity = true;
    this.stageError = '';
    this.stageSuccess = '';

    this.oportunidadService
      .cerrarOportunidad(this.oportunidad.id, etapa)
      .pipe(
        finalize(() => {
          this.isClosingOpportunity = false;
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response) => {
          if (this.oportunidad) {
            this.oportunidad = {
              ...this.oportunidad,
              etapa: etapa === 'Ganada' ? 'GANADO' : 'PERDIDO',
              estado: etapa === 'Ganada' ? 'G' : 'P',
              fechaCierreReal: new Date().toISOString()
            };
            this.selectedStage = this.oportunidad.etapa;
          }

          this.stageSuccess = response?.mensaje || `Oportunidad cerrada como ${etapa}.`;
        },
        error: (error) => {
          console.error('Error al cerrar oportunidad desde detalle:', error);
          this.stageError = 'No se pudo cerrar la oportunidad.';
        }
      });
  }

  linkCotizacion(): void {
    if (!this.oportunidad?.id) {
      return;
    }

    const tipNDP = this.cotizacionForm.tipNDP.trim().toUpperCase();
    const serieNDP = this.cotizacionForm.serieNDP.trim();
    const numNDP = this.cotizacionForm.numNDP.trim();

    if (!tipNDP || !serieNDP || !numNDP) {
      this.linkSuccess = '';
      this.linkError = 'Complete tipo, serie y numero para vincular la cotizacion.';
      return;
    }

    this.isLinkingCotizacion = true;
    this.linkError = '';
    this.linkSuccess = '';

    this.oportunidadService
      .vincularCotizacion(this.oportunidad.id, { tipNDP, serieNDP, numNDP })
      .pipe(
        finalize(() => {
          this.isLinkingCotizacion = false;
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response) => {
          if (this.oportunidad) {
            this.oportunidad = {
              ...this.oportunidad,
              tipNDP,
              serieNDP,
              numNDP,
              tieneCotizacion: true
            };
          }

          this.cotizacionForm = { tipNDP, serieNDP, numNDP };
          this.linkSuccess = response?.mensaje || 'Cotizacion vinculada correctamente.';
        },
        error: (error) => {
          console.error('Error al vincular cotizacion:', error);
          this.linkError = 'No se pudo vincular la cotizacion con la oportunidad.';
        }
      });
  }

  openCotizacionSearchModal(): void {
    this.cotizacionSearchPageNumber = 1;
    this.cotizacionSearchError = '';
    this.linkError = '';
    this.linkSuccess = '';
    this.cotizacionSearch.nomCliente = this.cotizacionSearch.nomCliente || this.oportunidad?.clienteNombre || '';
    this.cotizacionSearch.tipOrden = this.cotizacionSearch.tipOrden || this.oportunidad?.tipNDP || 'COT';
    this.isCotizacionModalOpen = true;
    this.searchCotizaciones();
  }

  closeCotizacionSearchModal(): void {
    this.isCotizacionModalOpen = false;
    this.isSearchingCotizaciones = false;
    this.cotizacionSearchError = '';
  }

  searchCotizaciones(pageNumber = 1): void {
    this.cotizacionSearchPageNumber = pageNumber;
    this.isSearchingCotizaciones = true;
    this.cotizacionSearchError = '';

    this.ordenPedidoService
      .getOrdenes({
        tipOrden: this.cotizacionSearch.tipOrden || 'COT',
        fechaDesde: this.cotizacionSearch.fechaDesde,
        fechaHasta: this.cotizacionSearch.fechaHasta,
        nomCliente: this.cotizacionSearch.nomCliente,
        codCliente: this.cotizacionSearch.codCliente,
        pageNumber: this.cotizacionSearchPageNumber,
        pageSize: this.cotizacionSearchPageSize
      })
      .pipe(
        finalize(() => {
          this.isSearchingCotizaciones = false;
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response) => {
          this.cotizacionResults = response.datos;
          this.cotizacionSearchTotalRecords = response.paginacion.totalRegistros;
          this.cotizacionSearchPageNumber = response.paginacion.paginaActual || this.cotizacionSearchPageNumber;
          this.cotizacionSearchPageSize = response.paginacion.pageSize || this.cotizacionSearchPageSize;
          this.cotizacionSearchTotalPages = Math.max(1, response.paginacion.totalPaginas || 1);
        },
        error: (error: Error) => {
          this.cotizacionResults = [];
          this.cotizacionSearchTotalRecords = 0;
          this.cotizacionSearchTotalPages = 1;
          this.cotizacionSearchError = error.message || 'No se pudieron cargar las cotizaciones disponibles.';
        }
      });
  }

  goToCotizacionSearchPage(delta: number): void {
    const nextPage = this.cotizacionSearchPageNumber + delta;
    if (nextPage < 1 || nextPage > this.cotizacionSearchTotalPages || this.isSearchingCotizaciones) {
      return;
    }

    this.searchCotizaciones(nextPage);
  }

  selectCotizacion(item: OrdenPedidoListadoItem): void {
    this.cotizacionForm = {
      tipNDP: (item.tipOrden || 'COT').trim().toUpperCase(),
      serieNDP: (item.serie || '').trim(),
      numNDP: (item.numero || '').trim()
    };
    this.linkError = '';
    this.linkSuccess = '';
    this.closeCotizacionSearchModal();
  }

  getAvatarInitials(): string {
    const source = this.oportunidad?.clienteNombre || this.oportunidad?.titulo || '';
    const initials = source
      .split(' ')
      .map((part) => part.trim())
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');

    return initials || 'OP';
  }

  getAvatarStyle(): Record<string, string> {
    const cacheKey = this.oportunidad?.clienteNombre || this.oportunidad?.titulo || String(this.oportunidad?.id ?? 'crm-opportunity');
    const cached = this.avatarStyleCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const hash = Array.from(cacheKey).reduce((acc, char) => acc + char.charCodeAt(0) * 17, 0);
    const hue = hash % 360;
    const style = {
      background: `linear-gradient(135deg, hsl(${hue} 72% 55%) 0%, hsl(${(hue + 26) % 360} 60% 45%) 100%)`,
      color: '#ffffff',
      boxShadow: `0 18px 34px hsla(${hue} 72% 42% / 0.22)`
    };

    this.avatarStyleCache.set(cacheKey, style);
    return style;
  }

  getStageClass(): string {
    const stage = (this.oportunidad?.etapa || 'PROSPECTO').toLowerCase();
    return `oportunidad-detalle-badge--${stage}`;
  }

  getPriorityClass(): string {
    const priority = (this.oportunidad?.prioridad || '').trim().toUpperCase();
    if (priority === 'ALTA') return 'oportunidad-detalle-badge--high';
    if (priority === 'MEDIA') return 'oportunidad-detalle-badge--medium';
    if (priority === 'BAJA') return 'oportunidad-detalle-badge--low';
    return 'oportunidad-detalle-badge--neutral';
  }

  getEstadoClass(): string {
    const estado = (this.oportunidad?.estado || '').trim().toUpperCase();
    if (estado === 'G') return 'oportunidad-detalle-badge--closed-win';
    if (estado === 'P') return 'oportunidad-detalle-badge--closed-lost';
    if (estado === 'I') return 'oportunidad-detalle-badge--neutral';
    return 'oportunidad-detalle-badge--active';
  }

  getEstadoLabel(): string {
    const estado = (this.oportunidad?.estado || '').trim().toUpperCase();
    if (estado === 'G') return 'Ganada';
    if (estado === 'P') return 'Perdida';
    if (estado === 'I') return 'Inactiva';
    return 'Activa';
  }

  getTipoClienteLabel(): string {
    return this.cliente?.tCliente || this.oportunidad?.tipoCliente || 'Sin clasificar';
  }

  getUbicacion(): string {
    const provincia = this.cliente?.provincia?.trim();
    const ciudad = this.cliente?.ciudad?.trim();
    const pais = this.cliente?.pais?.trim();
    if (provincia && ciudad) {
      return `${provincia} / ${ciudad}`;
    }
    return provincia || ciudad || pais || 'Ubicación no disponible';
  }

  getPrimaryContacto(): string {
    const contacto = this.contactos.find((item) => item.principal) ?? this.contactos[0];
    return contacto?.nomContacto || this.cliente?.contactoPrincipal || this.cliente?.contacto || 'Sin contacto principal';
  }

  getPrimaryEmail(): string {
    const contacto = this.contactos.find((item) => item.principal) ?? this.contactos[0];
    return contacto?.email || this.cliente?.emailPrincipal || this.cliente?.email || 'Sin correo';
  }

  getPrimaryPhone(): string {
    const contacto = this.contactos.find((item) => item.principal) ?? this.contactos[0];
    return contacto?.telefono1 || contacto?.movil || this.cliente?.telefonoPrincipal || this.cliente?.telefono1 || 'Sin teléfono';
  }

  formatAmount(value: number): string {
    return new Intl.NumberFormat('es-CR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(value || 0);
  }

  formatOrdenFecha(value: string): string {
    const raw = String(value ?? '').trim();
    if (!raw) {
      return 'N/D';
    }
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
      return raw;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      const [year, month, day] = raw.split('-');
      return `${day}/${month}/${year}`;
    }
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      const day = String(parsed.getDate()).padStart(2, '0');
      const month = String(parsed.getMonth() + 1).padStart(2, '0');
      const year = parsed.getFullYear();
      return `${day}/${month}/${year}`;
    }
    return raw;
  }

  trackByContacto(index: number, contacto: ClienteContactoUI): string | number {
    return contacto.id || `${contacto.nomContacto}-${index}`;
  }

  trackByCotizacion(_index: number, item: OrdenPedidoListadoItem): string {
    return [item.tipOrden, item.serie, item.numero, item.fecha].join('|');
  }

  private getTodayIsoDate(): string {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }

  private getFirstDayOfYear(): string {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), 0, 1);
    return new Date(firstDay.getTime() - firstDay.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }
}
