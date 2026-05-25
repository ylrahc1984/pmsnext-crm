import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs/operators';

import { SharedModule } from 'src/app/theme/shared/shared.module';
import { AuthService } from 'src/app/core/services/auth.service';
import { OportunidadEtapa, OportunidadResumenPipeline } from '../crm/oportunidades/oportunidad.models';
import { OportunidadService } from '../crm/oportunidades/oportunidad.service';
import { ErpDataTableColumn, ErpDataTableRow } from 'src/app/theme/shared/components/erp-data-table/erp-data-table.component';
import { ErpStatusTone } from 'src/app/theme/shared/components/erp-status-badge/erp-status-badge.component';

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

interface DashboardKpi {
  label: string;
  value: string | number;
  icon: string;
  hint: string;
  trend: string;
  tone: ErpStatusTone;
}

interface DashboardAlert {
  title: string;
  meta: string;
  icon: string;
  tone: ErpStatusTone;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, SharedModule],
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
  readonly todayLabel = new Intl.DateTimeFormat('es-CR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date());
  pipelineResumen: OportunidadResumenPipeline[] = [];
  readonly tableColumns: ErpDataTableColumn[] = [
    { key: 'area', label: 'Area' },
    { key: 'estado', label: 'Estado' },
    { key: 'responsable', label: 'Responsable' },
    { key: 'impacto', label: 'Impacto', align: 'end' }
  ];
  readonly miniChartPoints = [
    { label: 'Lun', value: 42 },
    { label: 'Mar', value: 58 },
    { label: 'Mie', value: 74 },
    { label: 'Jue', value: 63 },
    { label: 'Vie', value: 86 },
    { label: 'Sab', value: 54 },
    { label: 'Dom', value: 69 }
  ];

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

  get dashboardKpis(): DashboardKpi[] {
    return [
      {
        label: 'Pipeline total',
        value: this.totalOportunidades,
        icon: 'feather icon-git-branch',
        hint: this.formatCurrency(this.totalMontoEstimado),
        trend: `${this.tasaCierre}% cierre`,
        tone: 'info'
      },
      {
        label: 'En gestion',
        value: this.oportunidadesEnGestion,
        icon: 'feather icon-clock',
        hint: 'Prospecto, cotizacion y negociacion',
        trend: '+ operativo',
        tone: 'warning'
      },
      {
        label: 'Ganadas',
        value: this.oportunidadesGanadas,
        icon: 'feather icon-check-circle',
        hint: 'Oportunidades cerradas',
        trend: `${this.tasaCierre}%`,
        tone: 'success'
      },
      {
        label: 'Alertas activas',
        value: this.operationalAlerts.length,
        icon: 'feather icon-alert-triangle',
        hint: 'Riesgos comerciales y operativos',
        trend: this.crmError ? 'Critico' : 'Prioridad',
        tone: this.crmError ? 'danger' : 'warning'
      },
      {
        label: 'Compras pendientes',
        value: 2,
        icon: 'feather icon-shopping-bag',
        hint: 'Preparado para Compras Inteligentes',
        trend: 'ERP',
        tone: 'neutral'
      },
      {
        label: 'Ventas hoy',
        value: this.formatCurrency(this.totalMontoEstimado * 0.08),
        icon: 'feather icon-dollar-sign',
        hint: 'Indicador operativo estimado',
        trend: '+12%',
        tone: 'success'
      }
    ];
  }

  get operationalAlerts(): DashboardAlert[] {
    const alerts: DashboardAlert[] = [
      {
        title: `${this.oportunidadesEnGestion} oportunidades requieren seguimiento`,
        meta: 'Priorizar cotizaciones y negociaciones abiertas',
        icon: 'feather icon-target',
        tone: this.oportunidadesEnGestion > 0 ? 'warning' : 'success'
      },
      {
        title: '5 productos en nivel critico',
        meta: 'Inventario listo para integrarse a Compras Inteligentes',
        icon: 'feather icon-package',
        tone: 'danger'
      },
      {
        title: '2 ordenes pendientes de aprobacion',
        meta: 'Control operativo preparado para flujo ERP',
        icon: 'feather icon-clipboard',
        tone: 'info'
      }
    ];

    if (this.crmError) {
      return [
        {
          title: 'Resumen CRM no disponible',
          meta: this.crmError,
          icon: 'feather icon-alert-circle',
          tone: 'danger'
        },
        ...alerts
      ];
    }

    return alerts;
  }

  get operationalRows(): ErpDataTableRow[] {
    return [
      {
        area: 'CRM',
        estado: { value: this.crmLoading ? 'Actualizando' : 'Operativo', tone: this.crmLoading ? 'info' : 'success' },
        responsable: 'Comercial',
        impacto: `${this.totalOportunidades} ops`
      },
      {
        area: 'Inventario',
        estado: { value: 'Critico', tone: 'danger' },
        responsable: 'Compras',
        impacto: '5 items'
      },
      {
        area: 'Ordenes',
        estado: { value: 'Pendiente', tone: 'warning' },
        responsable: 'Operacion',
        impacto: '2 docs'
      },
      {
        area: 'Finanzas',
        estado: { value: 'Control', tone: 'info' },
        responsable: 'Administracion',
        impacto: 'CRC'
      }
    ];
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
