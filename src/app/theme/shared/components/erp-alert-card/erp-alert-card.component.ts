import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ErpStatusTone } from '../erp-status-badge/erp-status-badge.component';

@Component({
  selector: 'app-erp-alert-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './erp-alert-card.component.html',
  styleUrls: ['./erp-alert-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ErpAlertCardComponent {
  title = input.required<string>();
  meta = input<string>('');
  icon = input<string>('feather icon-alert-circle');
  tone = input<ErpStatusTone>('info');
}
