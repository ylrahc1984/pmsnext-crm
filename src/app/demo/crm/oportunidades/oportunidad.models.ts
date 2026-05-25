export const OPORTUNIDAD_ETAPAS = ['PROSPECTO', 'COTIZACION', 'NEGOCIACION', 'GANADO', 'PERDIDO'] as const;
export const OPORTUNIDAD_PRIORIDADES = ['Alta', 'Media', 'Baja'] as const;
export const OPORTUNIDAD_ORIGENES = ['Web', 'Telefono', 'Email', 'Referido', 'Evento', 'Redes Sociales'] as const;
export const OPORTUNIDAD_TIPOS_CLIENTE = ['Nuevo', 'Recurrente', 'VIP', 'Corporativo'] as const;

export type OportunidadEtapa = (typeof OPORTUNIDAD_ETAPAS)[number];
export type OportunidadPrioridad = (typeof OPORTUNIDAD_PRIORIDADES)[number];
export type OportunidadOrigen = (typeof OPORTUNIDAD_ORIGENES)[number];
export type OportunidadTipoCliente = (typeof OPORTUNIDAD_TIPOS_CLIENTE)[number];

export interface OportunidadApiDto {
  PPV04_IdOportunidad             ?: number | string | null;
  PPV04_CodClien                  ?: string | number | null;
  ClienteNombre                   ?: string | number | null;
  PPV04_Titulo                    ?: string | number | null;
  PPV04_Descripcion               ?: string | number | null;
  PPV04_MontoEstimado             ?: number | string | null;
  PPV04_Probabilidad              ?: number | string | null;
  PPV04_Etapa                     ?: string | number | null;
  PPV04_Estado                    ?: string | number | null;
  PPV04_FechaCreacion             ?: string | null;
  PPV04_FechaCierreEstimada       ?: string | null;
  PPV04_FechaCierreReal           ?: string | null;
  PPV04_Vendedor                  ?: string | number | null;
  PPV04_TipNDP                    ?: string | number | null;
  PPV04_SerieNDP                  ?: string | number | null;
  PPV04_NumNDP                    ?: string | number | null;
  PPV04_Origen                    ?: string | number | null;
  PPV04_Prioridad                 ?: string | number | null;
  PPV04_TipoCliente               ?: string | number | null;
}

export interface OportunidadUI {
  id                    : number;
  codCliente            : string;
  clienteNombre         : string;
  titulo                : string;
  descripcion           : string;
  montoEstimado         : number;
  probabilidad          : number;
  etapa                 : OportunidadEtapa;
  estado                : string;
  fechaCreacion         : string;
  fechaCierreEstimada   : string | null;
  fechaCierreReal       : string | null;
  vendedor              : string;
  tipNDP                : string;
  serieNDP              : string;
  numNDP                : string;
  origen                : string;
  prioridad             : string;
  tipoCliente           : string;
  tieneCotizacion       : boolean;
}

export interface OportunidadFiltros {
  busqueda        ?: string;
  etapa           ?: string;
  estado          ?: string;
  vendedor        ?: string;
  fechaInicio     ?: string;
  fechaFin        ?: string;
  montoMin        ?: number | null;
  montoMax        ?: number | null;
  conCotizacion   ?: boolean | null;
}

export interface OportunidadFormValue {
  proceso                 : number;
  idOportunidad           : number;
  codCliente              : string;
  titulo                  : string;
  descripcion             : string;
  montoEstimado           : number;
  probabilidad            : number;
  etapa                   : OportunidadEtapa;
  vendedor                : string;
  fechaCierreEstimada     : string | null;
  origen                  : string;
  prioridad               : string;
  tipoCliente             : string;
  tipNDP                  : string;
  serieNDP                : string;
  numNDP                  : string;
  respuesta               : string;
}

export interface OportunidadResumenPipeline {
  etapa         : OportunidadEtapa;
  cantidad      : number;
  total         : number;
}
