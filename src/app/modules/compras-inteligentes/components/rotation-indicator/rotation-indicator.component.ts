import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-rotation-indicator',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rotation-indicator.component.html',
  styleUrls: ['./rotation-indicator.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RotationIndicatorComponent {
  diasRotacion = input.required<number>();
  diasCredito = input.required<number>();
  readonly riesgo = computed(() => this.diasRotacion() > this.diasCredito());
  readonly diferencia = computed(() => this.diasRotacion() - this.diasCredito());
  readonly rotacionWidth = computed(() => Math.min(this.diasRotacion(), 90));
  readonly creditoPosition = computed(() => Math.min(this.diasCredito(), 90));
}
