import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductoAnalitico } from '../../interfaces/compras-inteligentes.models';
import { InventoryStatusChipComponent } from '../inventory-status-chip/inventory-status-chip.component';

@Component({
  selector: 'app-inventory-health-card',
  standalone: true,
  imports: [CommonModule, InventoryStatusChipComponent],
  templateUrl: './inventory-health-card.component.html',
  styleUrls: ['./inventory-health-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InventoryHealthCardComponent {
  producto = input.required<ProductoAnalitico>();
}
