import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CdkDropList, CdkDragDrop } from '@angular/cdk/drag-drop';
import { PipelineCardComponent } from './pipeline-card.component';
import { PipelineOpportunity, PipelineStage } from './pipeline.models';

@Component({
  selector: 'app-pipeline-column',
  standalone: true,
  imports: [CommonModule, CdkDropList, PipelineCardComponent],
  templateUrl: './pipeline-column.component.html',
  styleUrl: './pipeline-column.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PipelineColumnComponent {
  stage = input.required<PipelineStage>();
  items = input.required<PipelineOpportunity[]>();
  dropListId = input.required<string>();
  connectedDropLists = input.required<string[]>();
  updatingIds = input<string[]>([]);

  stageDropped = output<{ stage: PipelineStage; event: CdkDragDrop<PipelineOpportunity[]> }>();

  stageClass = computed(() => `pipeline-column--${this.stage().toLowerCase()}`);
  stageLabel = computed(() => {
    switch (this.stage()) {
      case 'COTIZACION':
        return 'Cotización';
      case 'NEGOCIACION':
        return 'Negociación';
      case 'GANADO':
        return 'Ganado';
      case 'PERDIDO':
        return 'Perdido';
      default:
        return 'Prospecto';
    }
  });
  totalAmount = computed(() => this.items().reduce((acc, item) => acc + Number(item.montoEstimado || 0), 0));

  emitDrop(event: CdkDragDrop<PipelineOpportunity[]>): void {
    this.stageDropped.emit({ stage: this.stage(), event });
  }

  isUpdating(id: string): boolean {
    return this.updatingIds().includes(id);
  }

  trackByOpportunity(_: number, opportunity: PipelineOpportunity): string {
    return opportunity.id;
  }

  formatAmount(value: number): string {
    return `CRC ${new Intl.NumberFormat('es-CR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(value || 0)}`;
  }
}
