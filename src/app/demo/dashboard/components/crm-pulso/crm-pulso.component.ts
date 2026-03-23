import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs/operators';

import { OportunidadResumenPipeline } from 'src/app/demo/crm/oportunidades/oportunidad.models';
import { OportunidadService } from 'src/app/demo/crm/oportunidades/oportunidad.service';

@Component({
  selector: 'app-crm-pulso',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './crm-pulso.component.html',
  styleUrls: ['./crm-pulso.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CrmPulsoComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly oportunidadService = inject(OportunidadService);

  loading = true;
  error: string | null = null;
  resumen: OportunidadResumenPipeline[] = [];

  ngOnInit(): void {
    this.loadResumen();
  }

  get totalPipeline(): number {
    return this.resumen.reduce((acc, item) => acc + item.total, 0);
  }

  get totalOportunidades(): number {
    return this.resumen.reduce((acc, item) => acc + item.cantidad, 0);
  }

  get enNegociacion(): number {
    return this.getCantidadByStage('NEGOCIACION');
  }

  get ganadas(): number {
    return this.getCantidadByStage('GANADO');
  }

  get perdidas(): number {
    return this.getCantidadByStage('PERDIDO');
  }

  get tasaCierre(): number {
    const total = this.totalOportunidades;
    if (!total) {
      return 0;
    }
    return Math.round((this.ganadas / total) * 100);
  }

  reload(): void {
    this.loadResumen();
  }

  formatCurrency(value: number): string {
    return `₡ ${new Intl.NumberFormat('es-CR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(value || 0)}`;
  }

  private loadResumen(): void {
    this.loading = true;
    this.error = null;

    this.oportunidadService
      .getPipelineResumen()
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (resumen) => {
          this.resumen = resumen;
        },
        error: (error) => {
          console.error('Error cargando widget Pulso CRM:', error);
          this.resumen = [];
          this.error = 'No se pudo cargar el pulso comercial.';
        }
      });
  }

  private getCantidadByStage(stage: OportunidadResumenPipeline['etapa']): number {
    return this.resumen.find((item) => item.etapa === stage)?.cantidad ?? 0;
  }
}
