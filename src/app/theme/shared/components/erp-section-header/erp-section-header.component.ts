import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-erp-section-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './erp-section-header.component.html',
  styleUrls: ['./erp-section-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ErpSectionHeaderComponent {
  title = input.required<string>();
  eyebrow = input<string>('');
  description = input<string>('');
}
