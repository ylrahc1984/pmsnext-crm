import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EstadoInventario } from '../../interfaces/compras-inteligentes.models';

@Component({
  selector: 'app-inventory-status-chip',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="inventory-status-chip" [ngClass]="'inventory-status-chip--' + estado()">
      <span></span>
      {{ label() }}
    </span>
  `,
  styleUrls: ['./inventory-status-chip.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InventoryStatusChipComponent {
  estado = input.required<EstadoInventario>();
  readonly label = computed(() => {
    const estado = this.estado();
    return estado === 'saludable' ? 'Saludable' : estado === 'riesgo' ? 'Riesgo' : 'Critico';
  });
}
