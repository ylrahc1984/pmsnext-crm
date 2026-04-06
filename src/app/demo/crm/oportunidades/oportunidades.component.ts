import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { finalize } from 'rxjs/operators';
import { filter } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { OPORTUNIDAD_ETAPAS, OportunidadEtapa, OportunidadUI } from './oportunidad.models';
import { OportunidadService } from './oportunidad.service';

@Component({
  selector: 'app-oportunidades',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './oportunidades.component.html',
  styleUrl: './oportunidades.component.scss'
})
export class OportunidadesComponent implements OnInit {
  private oportunidadService = inject(OportunidadService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private loadRequestId = 0;
  private wasOnOportunidadesList = false;

  readonly etapas = OPORTUNIDAD_ETAPAS;
  readonly skeletonRows = Array.from({ length: 5 }, (_, index) => index);

  isLoading = false;
  loadError = '';
  processingOpportunityId: number | null = null;
  oportunidades: OportunidadUI[] = [];

  filtros = {
    busqueda: '',
    etapa: '',
    estado: 'A',
    vendedor: '',
    conCotizacion: ''
  };

  ngOnInit(): void {
    this.wasOnOportunidadesList = this.isOportunidadesListUrl(this.router.url);
    this.setupNavigationRefresh();
    this.loadOportunidades();
  }

  private setupNavigationRefresh(): void {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((event) => {
        const isNowOnList = this.isOportunidadesListUrl(event.urlAfterRedirects);
        const shouldReload = isNowOnList && !this.wasOnOportunidadesList;
        this.wasOnOportunidadesList = isNowOnList;

        if (shouldReload) {
          this.loadOportunidades();
        }
      });
  }

  private isOportunidadesListUrl(url: string): boolean {
    const cleanUrl = (url || '').split('?')[0].replace(/\/+$/, '');
    return cleanUrl === '/crm/oportunidades';
  }

  get totalOportunidades(): number {
    return this.oportunidades.length;
  }

  get totalMonto(): number {
    return this.oportunidades.reduce((sum, item) => sum + item.montoEstimado, 0);
  }

  get hasFilters(): boolean {
    return !!(
      this.filtros.busqueda.trim() ||
      this.filtros.etapa ||
      this.filtros.estado !== 'A' ||
      this.filtros.vendedor.trim() ||
      this.filtros.conCotizacion
    );
  }

  loadOportunidades(): void {
    const requestId = ++this.loadRequestId;
    const filtrosSnapshot = {
      busqueda: this.filtros.busqueda.trim(),
      etapa: this.filtros.etapa,
      estado: this.filtros.estado,
      vendedor: this.filtros.vendedor.trim(),
      conCotizacion: this.filtros.conCotizacion
    };

    this.isLoading = true;
    this.loadError = '';

    this.oportunidadService
      .getPipelineDetalle({
        busqueda: filtrosSnapshot.busqueda || undefined,
        etapa: filtrosSnapshot.etapa || undefined,
        estado: filtrosSnapshot.estado || undefined,
        vendedor: filtrosSnapshot.vendedor || undefined,
        conCotizacion: filtrosSnapshot.conCotizacion === '' ? undefined : filtrosSnapshot.conCotizacion === 'true'
      })
      .pipe(
        finalize(() => {
          if (requestId === this.loadRequestId) {
            this.isLoading = false;
          }
        })
      )
      .subscribe({
        next: (items) => {
          if (requestId !== this.loadRequestId) {
            return;
          }
          this.oportunidades = (items ?? []).filter((item) => this.isRenderableOportunidad(item));
        },
        error: (error) => {
          if (requestId !== this.loadRequestId) {
            return;
          }
          console.error('Error al cargar oportunidades CRM:', error);
          this.oportunidades = [];
          this.loadError = 'No se pudo cargar el listado de oportunidades. Verifique la conexión con el API.';
        }
      });
  }

  private isRenderableOportunidad(item: OportunidadUI | null | undefined): item is OportunidadUI {
    if (!item) {
      return false;
    }

    const id = Number(item.id ?? 0);
    const titulo = String(item.titulo ?? '').trim();
    const clienteNombre = String(item.clienteNombre ?? '').trim();
    const codCliente = String(item.codCliente ?? '').trim();
    const monto = Number(item.montoEstimado ?? 0);

    // Evita tarjetas fantasma cuando el API devuelve filas vacías o incompletas.
    return id > 0 || !!titulo || !!clienteNombre || !!codCliente || monto > 0;
  }

  clearFilters(): void {
    this.filtros = {
      busqueda: '',
      etapa: '',
      estado: 'A',
      vendedor: '',
      conCotizacion: ''
    };
    this.loadOportunidades();
  }

  openNew(): void {
    this.router.navigate(['/crm/oportunidades/nueva']);
  }

  openEdit(oportunidad: OportunidadUI): void {
    this.router.navigate(['/crm/oportunidades', oportunidad.id, 'editar']);
  }

  openDetail(oportunidad: OportunidadUI): void {
    this.router.navigate(['/crm/oportunidades', oportunidad.id]);
  }

  cambiarPrioridad(oportunidad: OportunidadUI, prioridad: 'Alta' | 'Media' | 'Baja'): void {
    if (!oportunidad?.id || this.processingOpportunityId === oportunidad.id) {
      return;
    }

    this.processingOpportunityId = oportunidad.id;
    this.oportunidadService.actualizarPrioridad(oportunidad.id, prioridad).pipe(finalize(() => {
      this.processingOpportunityId = null;
    })).subscribe({
      next: (response) => {
        this.oportunidades = this.oportunidades.map((item) =>
          item.id === oportunidad.id ? { ...item, prioridad } : item
        );
        void Swal.fire({
          title: 'Prioridad actualizada',
          text: response?.mensaje || `Prioridad actualizada a ${prioridad}.`,
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        });
      },
      error: (error) => {
        console.error('Error al actualizar prioridad:', error);
        void Swal.fire({
          title: 'Error',
          text: 'No se pudo actualizar la prioridad.',
          icon: 'error'
        });
      }
    });
  }

  cerrarOportunidad(oportunidad: OportunidadUI, etapa: 'Ganada' | 'Perdida'): void {
    if (!oportunidad?.id || this.processingOpportunityId === oportunidad.id) {
      return;
    }

    const etapaLabel = etapa === 'Ganada' ? 'Ganada' : 'Perdida';
    this.processingOpportunityId = oportunidad.id;
    this.oportunidadService.cerrarOportunidad(oportunidad.id, etapa).pipe(finalize(() => {
      this.processingOpportunityId = null;
    })).subscribe({
      next: (response) => {
        this.oportunidades = this.oportunidades.map((item) =>
          item.id === oportunidad.id
            ? {
                ...item,
                etapa: etapa === 'Ganada' ? 'GANADO' : 'PERDIDO',
                estado: etapa === 'Ganada' ? 'G' : 'P',
                fechaCierreReal: new Date().toISOString()
              }
            : item
        );
        void Swal.fire({
          title: 'Oportunidad cerrada',
          text: response?.mensaje || `Oportunidad cerrada como ${etapaLabel}.`,
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        });
      },
      error: (error) => {
        console.error('Error al cerrar oportunidad:', error);
        void Swal.fire({
          title: 'Error',
          text: 'No se pudo cerrar la oportunidad.',
          icon: 'error'
        });
      }
    });
  }

  crearCotizacion(oportunidad: OportunidadUI): void {
    if (oportunidad.tieneCotizacion || oportunidad.estado === 'I') {
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

  openCotizacion(oportunidad: OportunidadUI): void {
    if (oportunidad.tieneCotizacion) {
      this.router.navigate(['/demo/ordenes-pedido'], {
        queryParams: {
          tipOrden: oportunidad.tipNDP || 'COT',
          nomCliente: oportunidad.clienteNombre || '',
          serie: oportunidad.serieNDP || '',
          numero: oportunidad.numNDP || ''
        }
      });
      return;
    }

    this.crearCotizacion(oportunidad);
  }

  goToPipeline(): void {
    this.router.navigate(['/crm/pipeline']);
  }

  async archive(oportunidad: OportunidadUI): Promise<void> {
    const result = await Swal.fire({
      title: 'Archivar oportunidad',
      text: `Se marcará como inactiva "${oportunidad.titulo}".`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Archivar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc3545'
    });

    if (!result.isConfirmed) {
      return;
    }

    this.oportunidadService.delete(oportunidad.id).subscribe({
      next: async (response) => {
        await Swal.fire({
          title: 'Oportunidad archivada',
          text: response?.mensaje || 'La oportunidad se archivó correctamente.',
          icon: 'success',
          timer: 1800,
          showConfirmButton: false
        });
        this.loadOportunidades();
      },
      error: async (error) => {
        console.error('Error al archivar oportunidad:', error);
        await Swal.fire({
          title: 'Error',
          text: 'No se pudo archivar la oportunidad.',
          icon: 'error'
        });
      }
    });
  }

  getStageClass(stage: OportunidadEtapa): string {
    return `crm-opportunity-card__stage--${stage.toLowerCase()}`;
  }

  getEstadoBadgeClass(estado: string): string {
    const normalized = (estado || '').trim().toUpperCase();
    if (normalized === 'G') return 'crm-opportunity-card__status--ganada';
    if (normalized === 'P') return 'crm-opportunity-card__status--perdida';
    if (normalized === 'I') return 'crm-opportunity-card__status--inactive';
    return 'crm-opportunity-card__status--activa';
  }

  getEstadoLabel(estado: string): string {
    const normalized = (estado || '').trim().toUpperCase();
    if (normalized === 'G') return 'Ganada';
    if (normalized === 'P') return 'Perdida';
    if (normalized === 'I') return 'Inactiva';
    return 'Activa';
  }

  getPrioridadClass(prioridad: string): string {
    const normalized = (prioridad || '').trim().toUpperCase();
    if (normalized === 'ALTA') return 'crm-opportunity-card__priority--alta';
    if (normalized === 'MEDIA') return 'crm-opportunity-card__priority--media';
    if (normalized === 'BAJA') return 'crm-opportunity-card__priority--baja';
    return 'crm-opportunity-card__priority--default';
  }

  canCloseOpportunity(oportunidad: OportunidadUI): boolean {
    const estado = (oportunidad.estado || '').trim().toUpperCase();
    return estado !== 'G' && estado !== 'P' && estado !== 'I';
  }

  getProbabilityClass(value: number): string {
    if (value >= 75) return 'crm-opportunity-card__probability--high';
    if (value >= 40) return 'crm-opportunity-card__probability--medium';
    return 'crm-opportunity-card__probability--low';
  }

  canCreateCotizacion(oportunidad: OportunidadUI): boolean {
    return !oportunidad.tieneCotizacion && oportunidad.estado !== 'I';
  }

  canOpenCotizacion(oportunidad: OportunidadUI): boolean {
    return oportunidad.tieneCotizacion || oportunidad.estado !== 'I';
  }

  getCotizacionActionLabel(oportunidad: OportunidadUI): string {
    if (oportunidad.tieneCotizacion) {
      return 'Ver cotizacion';
    }

    if (oportunidad.estado === 'I') {
      return 'Oportunidad inactiva';
    }

    return 'Cotizar';
  }

  formatAmount(value: number): string {
    return new Intl.NumberFormat('es-CR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(value || 0);
  }

  trackById(_: number, oportunidad: OportunidadUI): number {
    return oportunidad.id;
  }

  trackByIndex(index: number): number {
    return index;
  }
}
