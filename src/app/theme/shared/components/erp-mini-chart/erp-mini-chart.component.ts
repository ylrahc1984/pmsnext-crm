import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ErpMiniChartPoint {
  label: string;
  value: number;
}

@Component({
  selector: 'app-erp-mini-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './erp-mini-chart.component.html',
  styleUrls: ['./erp-mini-chart.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ErpMiniChartComponent {
  points = input<ErpMiniChartPoint[]>([]);
}
