import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RiesgoFinanciero } from '../../interfaces/compras-inteligentes.models';
import { InventoryStatusChipComponent } from '../inventory-status-chip/inventory-status-chip.component';

@Component({
  selector: 'app-supplier-credit-widget',
  standalone: true,
  imports: [CommonModule, InventoryStatusChipComponent],
  templateUrl: './supplier-credit-widget.component.html',
  styleUrls: ['./supplier-credit-widget.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SupplierCreditWidgetComponent {
  riesgo = input.required<RiesgoFinanciero>();
}
