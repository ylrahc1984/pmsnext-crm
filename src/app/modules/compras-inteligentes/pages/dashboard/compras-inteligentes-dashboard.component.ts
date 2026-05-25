import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ComprasInteligentesDataService } from '../../services/compras-inteligentes-data.service';
import { IntelligentKpiCardComponent } from '../../components/intelligent-kpi-card/intelligent-kpi-card.component';
import { ProductRiskTableComponent } from '../../components/product-risk-table/product-risk-table.component';
import { OperationalWidgetComponent } from '../../components/operational-widget/operational-widget.component';
import { InventoryAlertFeedComponent } from '../../components/inventory-alert-feed/inventory-alert-feed.component';
import { RecommendationPanelComponent } from '../../components/recommendation-panel/recommendation-panel.component';

@Component({
  selector: 'app-compras-inteligentes-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    IntelligentKpiCardComponent,
    ProductRiskTableComponent,
    OperationalWidgetComponent,
    InventoryAlertFeedComponent,
    RecommendationPanelComponent
  ],
  templateUrl: './compras-inteligentes-dashboard.component.html',
  styleUrls: ['../compras-inteligentes-page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ComprasInteligentesDashboardComponent {
  readonly data = inject(ComprasInteligentesDataService);
}
