import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ProductoAnalitico } from '../../interfaces/compras-inteligentes.models';
import { InventoryStatusChipComponent } from '../inventory-status-chip/inventory-status-chip.component';
import { RotationIndicatorComponent } from '../rotation-indicator/rotation-indicator.component';

@Component({
  selector: 'app-product-risk-table',
  standalone: true,
  imports: [CommonModule, RouterModule, InventoryStatusChipComponent, RotationIndicatorComponent],
  templateUrl: './product-risk-table.component.html',
  styleUrls: ['./product-risk-table.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductRiskTableComponent {
  productos = input.required<ProductoAnalitico[]>();
  mode = input<'dashboard' | 'productos'>('dashboard');
}
