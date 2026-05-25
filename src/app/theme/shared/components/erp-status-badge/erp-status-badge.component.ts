import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ErpStatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

@Component({
  selector: 'app-erp-status-badge',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './erp-status-badge.component.html',
  styleUrls: ['./erp-status-badge.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ErpStatusBadgeComponent {
  label = input.required<string>();
  tone = input<ErpStatusTone>('neutral');
}
