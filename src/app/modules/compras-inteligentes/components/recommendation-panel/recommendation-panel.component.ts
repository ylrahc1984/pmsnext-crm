import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { RecomendacionCompra } from '../../interfaces/compras-inteligentes.models';
import { ComprasInteligentesDataService } from '../../services/compras-inteligentes-data.service';
import { InventoryStatusChipComponent } from '../inventory-status-chip/inventory-status-chip.component';

@Component({
  selector: 'app-recommendation-panel',
  standalone: true,
  imports: [CommonModule, RouterModule, InventoryStatusChipComponent],
  templateUrl: './recommendation-panel.component.html',
  styleUrls: ['./recommendation-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecommendationPanelComponent {
  private readonly dataService = inject(ComprasInteligentesDataService);
  recomendaciones = input.required<RecomendacionCompra[]>();

  formatCurrency(value: number): string {
    return this.dataService.formatCurrency(value);
  }
}
