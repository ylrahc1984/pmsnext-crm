import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { SharedModule } from 'src/app/theme/shared/shared.module';
import { ClienteService } from './cliente.service';
import { ClienteListado } from './cliente.models';

@Component({
  selector: 'app-agencias-comisionistas',
  imports: [CommonModule, FormsModule, SharedModule],
  templateUrl: './agencias-comisionistas.component.html',
  styleUrls: ['./agencias-comisionistas.component.scss']
})
export class AgenciasComisionistasComponent implements OnInit {
  private clientesService = inject(ClienteService);
  private router = inject(Router);
  private readonly avatarStyleCache = new Map<string, Record<string, string>>();

  isLoading = false;
  contactosSearchTerm = '';
  contactosListado: ClienteListado[] = [];
  contactosLoadError = '';
  contactosCurrentPage = 1;
  contactosTotalPages = 1;
  totalContactosListado = 0;
  contactosPageSize = 10;
  readonly contactosPageSizeOptions = [10, 25, 50];
  readonly skeletonCards = Array.from({ length: 6 }, (_, index) => index);

  ngOnInit(): void {
    this.loadContactosListado();
  }

  get contactosActivosCount(): number {
    return this.contactosListado.length;
  }

  get nuevosEsteMesCount(): number {
    return Math.min(this.totalContactosListado, 6);
  }

  get hasSearchTerm(): boolean {
    return !!this.contactosSearchTerm.trim();
  }

  loadContactosListado(): void {
    this.isLoading = true;
    this.contactosLoadError = '';
    this.clientesService
      .getClientesListado(this.contactosCurrentPage, this.contactosPageSize, this.contactosSearchTerm.trim() || undefined)
      .subscribe({
        next: (result) => {
          this.contactosListado = result.data ?? [];
          this.contactosCurrentPage = result.paginaActual ?? this.contactosCurrentPage;
          this.contactosPageSize = result.pageSize ?? this.contactosPageSize;
          this.contactosTotalPages = result.totalPages ?? 1;
          this.totalContactosListado = result.totalRegistros ?? this.contactosListado.length;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error al cargar contactos CRM:', error);
          this.contactosListado = [];
          this.contactosTotalPages = 1;
          this.totalContactosListado = 0;
          this.contactosLoadError = 'No se pudieron cargar los contactos. Verifique la conexión con el API.';
          this.isLoading = false;
        }
      });
  }

  onBuscar() {
    this.contactosCurrentPage = 1;
    this.loadContactosListado();
  }

  onLimpiar() {
    this.contactosSearchTerm = '';
    this.contactosCurrentPage = 1;
    this.loadContactosListado();
  }

  onPageSizeChange() {
    this.contactosCurrentPage = 1;
    this.loadContactosListado();
  }

  goToPageRelative(delta: number) {
    const nextPage = this.contactosCurrentPage + delta;
    if (nextPage < 1 || nextPage > this.contactosTotalPages) {
      return;
    }
    this.contactosCurrentPage = nextPage;
    this.loadContactosListado();
  }

  openForm() {
    this.router.navigate(['/catalogos/clientes/nuevo']);
  }

  getListadoTipoLabel(tipo: string, subtipo: string): string {
    const normalizedSubtipo = this.normalizeCodigo(subtipo);
    const normalizedTipo = this.normalizeCodigo(tipo);

    if (normalizedSubtipo === 'DET') {
      return 'Detallista';
    }
    if (normalizedSubtipo === 'MAY') {
      return 'Mayorista';
    }
    if (normalizedTipo === 'AGE') {
      return 'Agencia';
    }
    if (normalizedTipo === 'CLI') {
      return 'Cliente';
    }
    return normalizedSubtipo || normalizedTipo || 'Sin tipo';
  }

  getListadoSubtipoLabel(subtipo: string): string {
    return subtipo?.trim() || 'General';
  }

  getListadoTipoClass(tipo: string, subtipo: string): string {
    const normalizedSubtipo = this.normalizeCodigo(subtipo);
    const normalizedTipo = this.normalizeCodigo(tipo);

    if (normalizedSubtipo === 'DET') {
      return 'crm-contact-card__badge--detallista';
    }
    if (normalizedSubtipo === 'MAY') {
      return 'crm-contact-card__badge--mayorista';
    }
    if (normalizedTipo === 'AGE') {
      return 'crm-contact-card__badge--agencia';
    }
    if (normalizedTipo === 'CLI') {
      return 'crm-contact-card__badge--cliente';
    }
    return 'crm-contact-card__badge--default';
  }

  getListadoUbicacion(contacto: ClienteListado): string {
    const provincia = contacto.provincia?.trim();
    const ciudad = contacto.ciudad?.trim();
    if (provincia && ciudad) {
      return `${provincia} / ${ciudad}`;
    }
    if (provincia || ciudad) {
      return provincia || ciudad || 'Ubicación no disponible';
    }
    return 'Ubicación no disponible';
  }

  getListadoInitials(contacto: ClienteListado): string {
    const initials = contacto.nombre
      .split(' ')
      .map((part) => part.trim())
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
    return initials || 'CR';
  }

  getAvatarStyle(contacto: ClienteListado): Record<string, string> {
    const cacheKey = contacto.nombre || contacto.id || 'crm';
    const cached = this.avatarStyleCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const hash = Array.from(cacheKey).reduce((acc, char) => acc + char.charCodeAt(0) * 17, 0);
    const hue = hash % 360;
    const style = {
      background: `linear-gradient(135deg, hsl(${hue} 68% 56%) 0%, hsl(${(hue + 26) % 360} 62% 48%) 100%)`,
      color: '#ffffff',
      boxShadow: `0 14px 28px hsla(${hue} 72% 45% / 0.24)`
    };

    this.avatarStyleCache.set(cacheKey, style);
    return style;
  }

  trackByListadoId(_: number, contacto: ClienteListado): string {
    return contacto.id;
  }

  trackByIndex(index: number): number {
    return index;
  }

  openContactoDetalle(contacto: ClienteListado): void {
    this.router.navigate(['/crm/contactos', contacto.id]);
  }

  openContactoEditar(contacto: ClienteListado): void {
    this.router.navigate(['/catalogos/clientes', contacto.id, 'editar']);
  }

  crearOportunidad(contacto: ClienteListado): void {
    this.router.navigate(['/crm/oportunidades/nueva'], {
      queryParams: {
        cliente: contacto.id,
        clienteNombre: contacto.nombre
      }
    });
  }

  async eliminarContacto(contacto: ClienteListado): Promise<void> {
    const result = await Swal.fire({
      title: 'Eliminar contacto',
      text: `Se eliminará "${contacto.nombre}".`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626'
    });

    if (!result.isConfirmed) {
      return;
    }

    this.clientesService.eliminarCliente(contacto.id).subscribe({
      next: async (response) => {
        await Swal.fire({
          title: 'Contacto eliminado',
          text: response?.respuesta || 'El contacto se eliminó correctamente.',
          icon: 'success',
          timer: 1800,
          showConfirmButton: false
        });
        this.loadContactosListado();
      },
      error: async (error) => {
        console.error('Error al eliminar contacto CRM:', error);
        await Swal.fire({
          title: 'Error',
          text: 'No se pudo eliminar el contacto.',
          icon: 'error'
        });
      }
    });
  }

  shouldShowNuevoBadge(contacto: ClienteListado): boolean {
    return (contacto.totalContactos ?? 0) <= 1;
  }

  handleCardKeydown(event: KeyboardEvent, contacto: ClienteListado): void {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }
    event.preventDefault();
    this.openContactoDetalle(contacto);
  }

  private normalizeCodigo(value: string | null | undefined): string {
    return (value ?? '').toString().trim().toUpperCase();
  }
}
