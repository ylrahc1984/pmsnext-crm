import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ComprasInteligentesDataService } from '../../services/compras-inteligentes-data.service';
import { OperationalWidgetComponent } from '../../components/operational-widget/operational-widget.component';
import { InventoryStatusChipComponent } from '../../components/inventory-status-chip/inventory-status-chip.component';

@Component({
  selector: 'app-compras-inteligentes-generar-pedido',
  standalone: true,
  imports: [CommonModule, FormsModule, OperationalWidgetComponent, InventoryStatusChipComponent],
  templateUrl: './compras-inteligentes-generar-pedido.component.html',
  styleUrls: ['../compras-inteligentes-page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ComprasInteligentesGenerarPedidoComponent {
  readonly data = inject(ComprasInteligentesDataService);
  readonly proveedor = signal('todos');
  readonly proveedores = computed(() => ['todos', ...new Set(this.data.pedidoSugerido().map((item) => item.proveedor))]);
  readonly items = computed(() => {
    const proveedor = this.proveedor();
    return this.data.pedidoSugerido().filter((item) => proveedor === 'todos' || item.proveedor === proveedor);
  });
  readonly total = computed(() => this.items().reduce((acc, item) => acc + item.costoEstimado, 0));
}
