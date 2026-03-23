import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs/operators';

import { SharedModule } from 'src/app/theme/shared/shared.module';
import { AuthService } from 'src/app/core/services/auth.service';
import { WelcomeCardComponent } from './components/welcome-card/welcome-card.component';
import { CrmPulsoComponent } from './components/crm-pulso/crm-pulso.component';
import { OportunidadEtapa, OportunidadResumenPipeline } from '../crm/oportunidades/oportunidad.models';
import { OportunidadService } from '../crm/oportunidades/oportunidad.service';

interface DashboardStageSnapshot {
  stage: OportunidadEtapa;
  label: string;
  cantidad: number;
  total: number;
  progress: number;
  accentClass: string;
}

interface DashboardStageConfig {
  stage: OportunidadEtapa;
  label: string;
  accentClass: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, SharedModule, WelcomeCardComponent, CrmPulsoComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly authService = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly router = inject(Router);
  private readonly oportunidadService = inject(OportunidadService);
  crmLoading = false;
  crmError: string | null = null;
  readonly userName = this.resolveUserName();
  pipelineResumen: OportunidadResumenPipeline[] = [];

  ngOnInit() {
    this.loadCrmResumen();
  }

  get stageSnapshots(): DashboardStageSnapshot[] {
    const total = this.totalOportunidades;
    const stageMap = new Map<string, OportunidadResumenPipeline>(this.pipelineResumen.map((item) => [item.etapa, item]));
    const stageConfigs: DashboardStageConfig[] = [
      { stage: 'PROSPECTO', label: 'Prospecto', accentClass: 'dashboard-stage--prospecto' },
      { stage: 'COTIZACION', label: 'Cotización', accentClass: 'dashboard-stage--cotizacion' },
      { stage: 'NEGOCIACION', label: 'Negociación', accentClass: 'dashboard-stage--negociacion' },
      { stage: 'GANADO', label: 'Ganado', accentClass: 'dashboard-stage--ganado' },
      { stage: 'PERDIDO', label: 'Perdido', accentClass: 'dashboard-stage--perdido' }
    ];

    return stageConfigs.map((config) => {
      const match = stageMap.get(config.stage);
      const cantidad = match?.cantidad ?? 0;
      return {
        ...config,
        cantidad,
        total: match?.total ?? 0,
        progress: total > 0 ? Math.round((cantidad / total) * 100) : 0
      };
    });
  }

  get totalOportunidades(): number {
    return this.pipelineResumen.reduce((acc, item) => acc + item.cantidad, 0);
  }

  get totalMontoEstimado(): number {
    return this.pipelineResumen.reduce((acc, item) => acc + item.total, 0);
  }

  get oportunidadesEnGestion(): number {
    return this.getStageCount('PROSPECTO') + this.getStageCount('COTIZACION') + this.getStageCount('NEGOCIACION');
  }

  get oportunidadesGanadas(): number {
    return this.getStageCount('GANADO');
  }

  get oportunidadesPerdidas(): number {
    return this.getStageCount('PERDIDO');
  }

  get tasaCierre(): number {
    const resolved = this.oportunidadesGanadas + this.oportunidadesPerdidas;
    if (!resolved) {
      return 0;
    }
    return Math.round((this.oportunidadesGanadas / resolved) * 100);
  }

  reloadCrmResumen(): void {
    this.loadCrmResumen();
  }

  irAEtapa(etapa: OportunidadEtapa): void {
    void this.router.navigate(['/crm/pipeline'], {
      queryParams: { etapa }
    });
  }

  formatCurrency(value: number): string {
    return `CRC ${new Intl.NumberFormat('es-CR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(value || 0)}`;
  }

  private loadCrmResumen(): void {
    this.crmLoading = true;
    this.crmError = null;

    this.oportunidadService
      .getPipelineResumen()
      .pipe(
        finalize(() => {
          this.crmLoading = false;
          this.cdr.markForCheck();
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (resumen) => {
          this.pipelineResumen = resumen;
        },
        error: (error) => {
          console.error('Error cargando resumen CRM del dashboard:', error);
          this.pipelineResumen = [];
          this.crmError = 'No se pudo cargar el resumen comercial del CRM.';
        }
      });
  }

  private getStageCount(stage: string): number {
    return this.pipelineResumen.find((item) => item.etapa === stage)?.cantidad ?? 0;
  }

  private resolveUserName(): string {
    const user = this.authService.getCurrentUser();
    return String(user?.nombreUsu ?? user?.usuario ?? 'Usuario').trim() || 'Usuario';
  }
}
