import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, HostListener, computed, inject, input } from '@angular/core';
import { CdkDrag, CdkDragHandle } from '@angular/cdk/drag-drop';
import { Router } from '@angular/router';
import { PipelineOpportunity } from './pipeline.models';

@Component({
  selector: 'app-pipeline-card',
  standalone: true,
  imports: [CommonModule, CdkDrag, CdkDragHandle],
  templateUrl: './pipeline-card.component.html',
  styleUrl: './pipeline-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PipelineCardComponent {
  private router = inject(Router);
  private elementRef = inject(ElementRef<HTMLElement>);
  opportunity = input.required<PipelineOpportunity>();
  isUpdating = input(false);
  menuOpen = false;

  probabilityClass = computed(() => {
    const value = this.opportunity().probabilidad;
    if (value >= 70) {
      return 'pipeline-card__probability--high';
    }
    if (value >= 31) {
      return 'pipeline-card__probability--medium';
    }
    return 'pipeline-card__probability--low';
  });

  formatAmount(value: number): string {
    return new Intl.NumberFormat('es-CR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(value || 0);
  }

  openFromCard(): void {
    const id = this.opportunity().id;
    if (!id || this.isUpdating()) {
      return;
    }
    void this.router.navigate(['/crm/oportunidades', id]);
  }

  toggleMenu(event: Event): void {
    this.stopAction(event);
    this.menuOpen = !this.menuOpen;
  }

  openDetail(event: Event): void {
    this.stopAction(event);
    this.menuOpen = false;
    const id = this.opportunity().id;
    if (!id) {
      return;
    }
    void this.router.navigate(['/crm/oportunidades', id]);
  }

  openEdit(event: Event): void {
    this.stopAction(event);
    this.menuOpen = false;
    const id = this.opportunity().id;
    if (!id) {
      return;
    }
    void this.router.navigate(['/crm/oportunidades', id, 'editar']);
  }

  openCliente(event: Event): void {
    this.stopAction(event);
    this.menuOpen = false;
    const codCliente = this.opportunity().codCliente;
    if (!codCliente) {
      return;
    }
    void this.router.navigate(['/crm/contactos', codCliente]);
  }

  openCotizacion(event: Event): void {
    this.stopAction(event);
    this.menuOpen = false;
    const opportunity = this.opportunity();
    if (!opportunity.id) {
      return;
    }

    if (opportunity.tieneCotizacion) {
      void this.router.navigate(['/demo/ordenes-pedido'], {
        queryParams: {
          tipOrden: opportunity.tipNDP || 'COT',
          nomCliente: opportunity.clienteNombre || '',
          serie: opportunity.serieNDP || '',
          numero: opportunity.numNDP || ''
        }
      });
      return;
    }

    void this.router.navigate(['/crm/oportunidades', opportunity.id, 'cotizacion'], {
      queryParams: {
        oportunidadId: opportunity.id,
        codCliente: opportunity.codCliente,
        clienteNombre: opportunity.clienteNombre,
        codVendedor: opportunity.vendedor,
        titulo: opportunity.titulo,
        etapaActual: opportunity.etapa
      }
    });
  }

  @HostListener('document:click', ['$event'])
  closeMenuOnOutsideClick(event: Event): void {
    if (!this.menuOpen) {
      return;
    }

    const host = this.elementRef.nativeElement;
    if (!host.contains(event.target as Node | null)) {
      this.menuOpen = false;
    }
  }

  private stopAction(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
  }
}
