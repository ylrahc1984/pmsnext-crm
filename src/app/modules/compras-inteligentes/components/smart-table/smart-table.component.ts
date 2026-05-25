import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface SmartTableColumn {
  key: string;
  label: string;
  align?: 'start' | 'center' | 'end';
}

export type SmartTableRow = Record<string, string | number>;

@Component({
  selector: 'app-smart-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './smart-table.component.html',
  styleUrls: ['./smart-table.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SmartTableComponent {
  columns = input.required<SmartTableColumn[]>();
  rows = input.required<SmartTableRow[]>();
}
