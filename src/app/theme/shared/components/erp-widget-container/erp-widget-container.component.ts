import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-erp-widget-container',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './erp-widget-container.component.html',
  styleUrls: ['./erp-widget-container.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ErpWidgetContainerComponent {
  title = input.required<string>();
  subtitle = input<string>('');
  compact = input<boolean>(false);
}
