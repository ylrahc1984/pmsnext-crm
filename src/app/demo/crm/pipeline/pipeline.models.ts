export const ETAPAS = ['PROSPECTO', 'COTIZACION', 'NEGOCIACION', 'GANADO', 'PERDIDO'] as const;

export type PipelineStage = (typeof ETAPAS)[number];

export interface PipelineOpportunityApi {
  PPV04_IdOportunidad?: string | number | null;
  PPV04_CodClien?: string | number | null;
  ClienteNombre?: string | null;
  PPV04_Titulo?: string | null;
  PPV04_MontoEstimado?: number | string | null;
  PPV04_Probabilidad?: number | string | null;
  PPV04_Etapa?: string | null;
  PPV04_Vendedor?: string | null;
  PPV04_TipNDP?: string | number | null;
  PPV04_SerieNDP?: string | number | null;
  PPV04_NumNDP?: string | number | null;
}

export interface PipelineOpportunity {
  id: string;
  codCliente: string;
  clienteNombre: string;
  titulo: string;
  montoEstimado: number;
  probabilidad: number;
  etapa: PipelineStage;
  vendedor: string;
  tipNDP: string;
  serieNDP: string;
  numNDP: string;
  tieneCotizacion: boolean;
}

export interface PipelineColumn {
  stage: PipelineStage;
  items: PipelineOpportunity[];
}
