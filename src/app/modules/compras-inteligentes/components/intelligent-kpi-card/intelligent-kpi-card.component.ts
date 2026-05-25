import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KPIInventario } from '../../interfaces/compras-inteligentes.models';

@Component({
  selector: 'app-intelligent-kpi-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './intelligent-kpi-card.component.html',
  styleUrls: ['./intelligent-kpi-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class IntelligentKpiCardComponent {
  kpi = input.required<KPIInventario>();
}
