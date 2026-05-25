import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-operational-widget',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './operational-widget.component.html',
  styleUrls: ['./operational-widget.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OperationalWidgetComponent {
  title = input.required<string>();
  subtitle = input<string>('');
  compact = input<boolean>(false);
}
