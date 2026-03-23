import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { finalize } from 'rxjs/operators';
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

  readonly etapas = OPORTUNIDAD_ETAPAS;
  readonly skeletonRows = Array.from({ length: 5 }, (_, index) => index);

  isLoading = false;
  loadError = '';
  oportunidades: OportunidadUI[] = [];

  filtros = {
    busqueda: '',
    etapa: '',
    estado: 'A',
    vendedor: '',
    conCotizacion: ''
  };

  ngOnInit(): void {
    this.loadOportunidades();
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
    this.isLoading = true;
    this.loadError = '';

    this.oportunidadService
      .getPipelineDetalle({
        busqueda: this.filtros.busqueda.trim() || undefined,
        etapa: this.filtros.etapa || undefined,
        estado: this.filtros.estado || undefined,
        vendedor: this.filtros.vendedor.trim() || undefined,
        conCotizacion: this.filtros.conCotizacion === '' ? undefined : this.filtros.conCotizacion === 'true'
      })
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (items) => {
          this.oportunidades = items;
        },
        error: (error) => {
          console.error('Error al cargar oportunidades CRM:', error);
          this.oportunidades = [];
          this.loadError = 'No se pudo cargar el listado de oportunidades. Verifique la conexión con el API.';
        }
      });
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
