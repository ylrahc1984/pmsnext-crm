import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { TimeoutError } from 'rxjs';
import { finalize, timeout } from 'rxjs/operators';
import { OportunidadUI } from '../oportunidades/oportunidad.models';
import { OportunidadService } from '../oportunidades/oportunidad.service';
import { ETAPAS, PipelineColumn, PipelineOpportunity, PipelineOpportunityApi, PipelineStage } from './pipeline.models';
import { PipelineColumnComponent } from './pipeline-column.component';

@Component({
  selector: 'app-pipeline',
  standalone: true,
  imports: [CommonModule, DragDropModule, FormsModule, PipelineColumnComponent],
  templateUrl: './pipeline.component.html',
  styleUrl: './pipeline.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PipelineComponent implements OnInit {
  private oportunidadService = inject(OportunidadService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);

  readonly etapas = ETAPAS;
  readonly cotizacionOptions = [
    { value: '', label: 'Todas' },
    { value: 'true', label: 'Con cotización' },
    { value: 'false', label: 'Sin cotización' }
  ];

  isLoading = false;
  hasLoadedOnce = false;
  loadError = '';
  actionError = '';
  columns: PipelineColumn[] = [];
  filters = {
    busqueda: '',
    etapa: '',
    vendedor: '',
    conCotizacion: ''
  };
  private stageMap = this.createEmptyStageMap();
  private updatingIds = new Set<string>();

  ngOnInit(): void {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const etapaParam = params.get('etapa');
      this.filters.etapa = etapaParam ? this.normalizeStage(etapaParam) : '';
      this.loadPipeline();
    });
  }

  get totalOpportunities(): number {
    return this.etapas.reduce((acc, stage) => acc + this.stageMap[stage].length, 0);
  }

  get totalEstimatedAmount(): number {
    return this.etapas.reduce(
      (acc, stage) => acc + this.stageMap[stage].reduce((sum, item) => sum + item.montoEstimado, 0),
      0
    );
  }

  get updatingOpportunityIds(): string[] {
    return Array.from(this.updatingIds);
  }

  get showRefreshingNotice(): boolean {
    return this.isLoading && this.hasLoadedOnce;
  }

  get showLoadingNotice(): boolean {
    return this.isLoading && !this.hasLoadedOnce;
  }

  get hasActiveFilters(): boolean {
    return this.activeFilterCount > 0;
  }

  get activeFilterCount(): number {
    let count = 0;
    if (this.filters.busqueda.trim()) count += 1;
    if (this.filters.etapa.trim()) count += 1;
    if (this.filters.vendedor.trim()) count += 1;
    if (this.filters.conCotizacion.trim()) count += 1;
    return count;
  }

  loadPipeline(): void {
    this.isLoading = true;
    this.loadError = '';
    this.actionError = '';

    this.oportunidadService
      .getPipelineDetalle({
        estado: 'A',
        busqueda: this.filters.busqueda.trim() || undefined,
        etapa: this.filters.etapa.trim() || undefined,
        vendedor: this.filters.vendedor.trim() || undefined,
        conCotizacion: this.resolveConCotizacionFilter()
      })
      .pipe(
        timeout(12000),
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe({
        next: (items) => {
          this.stageMap = this.groupByStage(items.map((item) => this.mapOpportunity(item)));
          this.rebuildColumns();
          this.hasLoadedOnce = true;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error al cargar pipeline CRM:', error);
          this.stageMap = this.createEmptyStageMap();
          this.rebuildColumns();
          this.hasLoadedOnce = true;
          this.loadError =
            error instanceof TimeoutError
              ? 'La consulta del pipeline tardó demasiado. Verifique si el endpoint responde o si aún no hay conectividad con el API.'
              : 'No se pudo cargar el pipeline. Verifique la conexión con el API.';
          this.cdr.markForCheck();
        }
      });
  }

  applyFilters(): void {
    this.loadPipeline();
  }

  clearFilters(): void {
    this.filters = {
      busqueda: '',
      etapa: '',
      vendedor: '',
      conCotizacion: ''
    };
    this.loadPipeline();
  }

  handleStageDrop({ stage, event }: { stage: PipelineStage; event: CdkDragDrop<PipelineOpportunity[]> }): void {
    this.actionError = '';

    const draggedOpportunity = event.previousContainer.data[event.previousIndex];
    if (draggedOpportunity && this.updatingIds.has(draggedOpportunity.id)) {
      return;
    }

    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      this.cdr.markForCheck();
      return;
    }

    const previousState = this.cloneStageMap(this.stageMap);
    transferArrayItem(event.previousContainer.data, event.container.data, event.previousIndex, event.currentIndex);

    const movedOpportunity = event.container.data[event.currentIndex];
    if (!movedOpportunity) {
      return;
    }

    movedOpportunity.etapa = stage;
    this.rebuildColumns();
    this.cdr.markForCheck();
    this.persistStageChange(movedOpportunity, stage, previousState);
  }

  connectedDropLists(_: PipelineStage): string[] {
    return this.etapas.map((stage) => this.dropListId(stage));
  }

  dropListId(stage: PipelineStage): string {
    return `pipeline-stage-${stage.toLowerCase()}`;
  }

  formatAmount(value: number): string {
    return new Intl.NumberFormat('es-CR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(value || 0);
  }

  trackByStage(_: number, column: PipelineColumn): string {
    return column.stage;
  }

  trackBySkeleton(_: number, stage: PipelineStage): string {
    return stage;
  }

  openOportunidades(): void {
    void this.router.navigate(['/crm/oportunidades']);
  }

  openCreateOpportunity(): void {
    void this.router.navigate(['/crm/oportunidades/nueva']);
  }

  private resolveConCotizacionFilter(): boolean | null {
    if (this.filters.conCotizacion === 'true') {
      return true;
    }
    if (this.filters.conCotizacion === 'false') {
      return false;
    }
    return null;
  }

  private persistStageChange(
    opportunity: PipelineOpportunity,
    nextStage: PipelineStage,
    previousState: Record<PipelineStage, PipelineOpportunity[]>
  ): void {
    this.updatingIds.add(opportunity.id);
    this.oportunidadService
      .changeStage(opportunity.id, nextStage)
      .pipe(
        finalize(() => {
          this.updatingIds.delete(opportunity.id);
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        error: (error) => {
          console.error('Error al actualizar etapa de oportunidad:', error);
          this.stageMap = previousState;
          this.rebuildColumns();
          this.actionError = 'No se pudo actualizar la etapa. La tarjeta volvió a su posición original.';
          this.cdr.markForCheck();
        }
      });
  }

  private mapOpportunity(item: OportunidadUI | PipelineOpportunityApi): PipelineOpportunity {
    const tipNDP = 'tipNDP' in item ? (item.tipNDP ?? '').trim() : String(item.PPV04_TipNDP ?? '').trim();
    const serieNDP = 'serieNDP' in item ? (item.serieNDP ?? '').trim() : String(item.PPV04_SerieNDP ?? '').trim();
    const numNDP = 'numNDP' in item ? (item.numNDP ?? '').trim() : String(item.PPV04_NumNDP ?? '').trim();

    return {
      id: 'id' in item ? String(item.id ?? '').trim() : String(item.PPV04_IdOportunidad ?? '').trim(),
      codCliente: 'codCliente' in item ? item.codCliente : String(item.PPV04_CodClien ?? '').trim(),
      clienteNombre: 'clienteNombre' in item ? item.clienteNombre : (item.ClienteNombre ?? '').trim(),
      titulo: 'titulo' in item ? item.titulo : (item.PPV04_Titulo ?? '').trim(),
      montoEstimado: 'montoEstimado' in item ? Number(item.montoEstimado ?? 0) : Number(item.PPV04_MontoEstimado ?? 0),
      probabilidad: 'probabilidad' in item ? Number(item.probabilidad ?? 0) : Number(item.PPV04_Probabilidad ?? 0),
      etapa: this.normalizeStage('etapa' in item ? item.etapa : item.PPV04_Etapa),
      vendedor: 'vendedor' in item ? item.vendedor : (item.PPV04_Vendedor ?? '').trim(),
      tipNDP,
      serieNDP,
      numNDP,
      tieneCotizacion: !!(tipNDP || serieNDP || numNDP)
    };
  }

  private normalizeStage(value: string | null | undefined): PipelineStage {
    const normalized = (value ?? '')
      .toString()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase();

    if (normalized === 'COTIZACION') {
      return 'COTIZACION';
    }
    if (normalized === 'NEGOCIACION') {
      return 'NEGOCIACION';
    }
    if (normalized === 'GANADO') {
      return 'GANADO';
    }
    if (normalized === 'PERDIDO') {
      return 'PERDIDO';
    }
    return 'PROSPECTO';
  }

  private groupByStage(items: PipelineOpportunity[]): Record<PipelineStage, PipelineOpportunity[]> {
    const grouped = this.createEmptyStageMap();
    for (const item of items) {
      grouped[item.etapa].push({ ...item });
    }
    return grouped;
  }

  private createEmptyStageMap(): Record<PipelineStage, PipelineOpportunity[]> {
    return {
      PROSPECTO: [],
      COTIZACION: [],
      NEGOCIACION: [],
      GANADO: [],
      PERDIDO: []
    };
  }

  private cloneStageMap(source: Record<PipelineStage, PipelineOpportunity[]>): Record<PipelineStage, PipelineOpportunity[]> {
    return {
      PROSPECTO: source.PROSPECTO.map((item) => ({ ...item })),
      COTIZACION: source.COTIZACION.map((item) => ({ ...item })),
      NEGOCIACION: source.NEGOCIACION.map((item) => ({ ...item })),
      GANADO: source.GANADO.map((item) => ({ ...item })),
      PERDIDO: source.PERDIDO.map((item) => ({ ...item }))
    };
  }

  private rebuildColumns(): void {
    this.columns = this.etapas.map((stage) => ({
      stage,
      items: this.stageMap[stage]
    }));
  }
}
