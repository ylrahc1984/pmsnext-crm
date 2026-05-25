// angular import
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

// project import
import { CardComponent } from './components/card/card.component';
import { DecisionModalComponent } from './components/decision-modal/decision-modal.component';
import { ErpAlertCardComponent } from './components/erp-alert-card/erp-alert-card.component';
import { ErpDataTableComponent } from './components/erp-data-table/erp-data-table.component';
import { ErpKpiCardComponent } from './components/erp-kpi-card/erp-kpi-card.component';
import { ErpMiniChartComponent } from './components/erp-mini-chart/erp-mini-chart.component';
import { ErpSectionHeaderComponent } from './components/erp-section-header/erp-section-header.component';
import { ErpStatusBadgeComponent } from './components/erp-status-badge/erp-status-badge.component';
import { ErpWidgetContainerComponent } from './components/erp-widget-container/erp-widget-container.component';

// bootstrap import
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { NgbCollapseModule } from '@ng-bootstrap/ng-bootstrap';

// third party
import { NgScrollbarModule } from 'ngx-scrollbar';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CardComponent,
    DecisionModalComponent,
    ErpAlertCardComponent,
    ErpDataTableComponent,
    ErpKpiCardComponent,
    ErpMiniChartComponent,
    ErpSectionHeaderComponent,
    ErpStatusBadgeComponent,
    ErpWidgetContainerComponent,
    NgbModule,
    NgScrollbarModule,
    NgbCollapseModule
  ],
  exports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CardComponent,
    DecisionModalComponent,
    ErpAlertCardComponent,
    ErpDataTableComponent,
    ErpKpiCardComponent,
    ErpMiniChartComponent,
    ErpSectionHeaderComponent,
    ErpStatusBadgeComponent,
    ErpWidgetContainerComponent,
    NgbModule,
    NgScrollbarModule,
    NgbCollapseModule
  ]
})
export class SharedModule {}
