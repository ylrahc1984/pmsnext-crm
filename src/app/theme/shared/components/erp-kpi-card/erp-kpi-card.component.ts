import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ErpStatusTone } from '../erp-status-badge/erp-status-badge.component';

@Component({
  selector: 'app-erp-kpi-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './erp-kpi-card.component.html',
  styleUrls: ['./erp-kpi-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ErpKpiCardComponent {
  label = input.required<string>();
  value = input.required<string | number>();
  icon = input<string>('feather icon-activity');
  hint = input<string>('');
  trend = input<string>('');
  tone = input<ErpStatusTone>('info');
}
