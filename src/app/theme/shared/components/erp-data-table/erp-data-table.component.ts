import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ErpStatusBadgeComponent, ErpStatusTone } from '../erp-status-badge/erp-status-badge.component';

export interface ErpDataTableColumn {
  key: string;
  label: string;
  align?: 'start' | 'end' | 'center';
}

export interface ErpDataTableCell {
  value: string | number;
  tone?: ErpStatusTone;
}

export type ErpDataTableRow = Record<string, string | number | ErpDataTableCell>;

@Component({
  selector: 'app-erp-data-table',
  standalone: true,
  imports: [CommonModule, ErpStatusBadgeComponent],
  templateUrl: './erp-data-table.component.html',
  styleUrls: ['./erp-data-table.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ErpDataTableComponent {
  columns = input.required<ErpDataTableColumn[]>();
  rows = input.required<ErpDataTableRow[]>();

  valueFor(row: ErpDataTableRow, key: string): string | number {
    const cell = row[key];
    return this.isCell(cell) ? cell.value : cell;
  }

  toneFor(row: ErpDataTableRow, key: string): ErpStatusTone | null {
    const cell = row[key];
    return this.isCell(cell) && cell.tone ? cell.tone : null;
  }

  labelFor(row: ErpDataTableRow, key: string): string {
    return String(this.valueFor(row, key));
  }

  private isCell(cell: string | number | ErpDataTableCell): cell is ErpDataTableCell {
    return typeof cell === 'object' && cell !== null && 'value' in cell;
  }
}
