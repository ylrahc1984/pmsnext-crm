import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { ComprasInteligentesDataService } from '../../services/compras-inteligentes-data.service';
import { InventoryHealthCardComponent } from '../../components/inventory-health-card/inventory-health-card.component';
import { SupplierCreditWidgetComponent } from '../../components/supplier-credit-widget/supplier-credit-widget.component';
import { RecommendationPanelComponent } from '../../components/recommendation-panel/recommendation-panel.component';
import { OperationalWidgetComponent } from '../../components/operational-widget/operational-widget.component';
import { SmartTableComponent, SmartTableColumn, SmartTableRow } from '../../components/smart-table/smart-table.component';

@Component({
  selector: 'app-compras-inteligentes-producto-detalle',
  standalone: true,
  imports: [CommonModule, RouterModule, InventoryHealthCardComponent, SupplierCreditWidgetComponent, RecommendationPanelComponent, OperationalWidgetComponent, SmartTableComponent],
  templateUrl: './compras-inteligentes-producto-detalle.component.html',
  styleUrls: ['../compras-inteligentes-page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ComprasInteligentesProductoDetalleComponent {
  private readonly route = inject(ActivatedRoute);
  readonly data = inject(ComprasInteligentesDataService);
  private readonly productoId = toSignal(this.route.paramMap.pipe(map((params) => params.get('id'))), { initialValue: null });
  readonly producto = computed(() => this.data.productoPorId(this.productoId()));
  readonly recomendaciones = computed(() => this.data.recomendaciones().filter((item) => item.productoId === this.productoId()));
  readonly historialColumns: SmartTableColumn[] = [
    { key: 'periodo', label: 'Periodo' },
    { key: 'compras', label: 'Compras', align: 'end' },
    { key: 'ventas', label: 'Ventas', align: 'end' },
    { key: 'stock', label: 'Stock cierre', align: 'end' }
  ];
  readonly historialRows: SmartTableRow[] = [
    { periodo: 'Semana 1', compras: 80, ventas: 42, stock: 180 },
    { periodo: 'Semana 2', compras: 0, ventas: 35, stock: 145 },
    { periodo: 'Semana 3', compras: 120, ventas: 28, stock: 237 },
    { periodo: 'Semana 4', compras: 0, ventas: 18, stock: 219 }
  ];
}
