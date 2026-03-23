import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { CotizacionUI } from './cotizacion.models';
import { CotizacionesKanbanComponent } from './cotizaciones-kanban.component';
import { CotizacionesListComponent } from './cotizaciones-list.component';
import { CotizacionesService } from './cotizaciones.service';

@Component({
  selector: 'app-cotizaciones',
  standalone: true,
  imports: [CommonModule, FormsModule, CotizacionesListComponent, CotizacionesKanbanComponent],
  templateUrl: './cotizaciones.component.html',
  styleUrl: './cotizaciones.component.scss'
})
export class CotizacionesComponent implements OnInit {
  private readonly cotizacionesService = inject(CotizacionesService);
  private readonly router = inject(Router);

  viewMode: 'list' | 'kanban' = 'list';
  cotizaciones: CotizacionUI[] = [];
  searchTerm = '';
  selectedEstado = '';
  isLoading = false;
  errorMessage = '';

  ngOnInit(): void {
    this.loadCotizaciones();
  }

  get filteredCotizaciones(): CotizacionUI[] {
    const search = this.searchTerm.trim().toLowerCase();
    const estado = this.selectedEstado.trim().toLowerCase();

    return this.cotizaciones.filter((item) => {
      const matchesSearch =
        !search ||
        item.numeroCompleto.toLowerCase().includes(search) ||
        item.cliente.toLowerCase().includes(search) ||
        item.vendedor.toLowerCase().includes(search);

      const matchesEstado = !estado || item.estado.toLowerCase() === estado;
      return matchesSearch && matchesEstado;
    });
  }

  get estados(): string[] {
    return Array.from(new Set(this.cotizaciones.map((item) => item.estado).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  }

  setViewMode(mode: 'list' | 'kanban'): void {
    this.viewMode = mode;
  }

  loadCotizaciones(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.cotizacionesService
      .getCotizaciones()
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (items) => {
          this.cotizaciones = items;
        },
        error: (error: unknown) => {
          console.error('Error al cargar cotizaciones:', error);
          this.cotizaciones = [];
          this.errorMessage = error instanceof Error ? error.message : 'No se pudieron cargar las cotizaciones.';
        }
      });
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedEstado = '';
  }

  openNuevo(): void {
    this.router.navigate(['/demo/ordenes-pedido/nuevo'], {
      queryParams: { tipNDP: 'COT' }
    });
  }
}
