import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ComprasAnalisisFiltros } from '../../interfaces/compras-reportes.interface';
import { AnalisisFiltrosComponent, PerspectivaAnalisis } from './components/analisis-filtros/analisis-filtros.component';
import { VentasAnalisisComponent } from './ventas/ventas-analisis.component';
import { ComprasAnalisisComponent } from './compras/compras-analisis.component';
import { RotacionAnalisisComponent } from './rotacion/rotacion-analisis.component';

@Component({
  selector: 'app-compras-analisis-workspace',
  standalone: true,
  imports: [AnalisisFiltrosComponent, VentasAnalisisComponent, ComprasAnalisisComponent, RotacionAnalisisComponent],
  templateUrl: './compras-analisis-workspace.component.html',
  styleUrls: ['../compras-inteligentes-page.scss', './compras-analisis-workspace.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ComprasAnalisisWorkspaceComponent {
  readonly perspectiva = signal<PerspectivaAnalisis>('ventas');
  readonly filtrosAplicados = signal<ComprasAnalisisFiltros | null>(null);
  readonly ventasLoading = signal(false);
  readonly comprasLoading = signal(false);
  readonly rotacionLoading = signal(false);

  seleccionar(perspectiva: PerspectivaAnalisis): void { this.perspectiva.set(perspectiva); }
  aplicarFiltros(filtros: ComprasAnalisisFiltros): void { this.filtrosAplicados.set(filtros); }
}
