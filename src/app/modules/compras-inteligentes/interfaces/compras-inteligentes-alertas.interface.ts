export type ComprasInteligentesPrioridad = 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA' | string;
export type ComprasInteligentesNivelImpacto = 'OPERACIONAL' | 'FINANCIERO' | 'COMERCIAL' | 'MIXTO' | string;

export interface ComprasInteligentesAlerta {
  categoriaAlerta: string;
  tipoAlerta: string;
  fuenteRegla: string;
  prioridad: ComprasInteligentesPrioridad;
  scorePrioridad: number;
  nivelImpacto: ComprasInteligentesNivelImpacto;
  esAlertaBase: boolean;
  codProducto: string;
  nomProducto: string;
  codAlmacen: string;
  categoriaProducto: string;
  lineaProducto: string;
  codProveedorPrincipal: string;
  nomProveedorPrincipal: string;
  stockActual: number;
  inventarioMinimo: number;
  inventarioMaximo: number;
  estadoInventario: string;
  estadoProducto: string;
  ventaNeta: number;
  costoVentaTotal: number;
  utilidadBrutaTotal: number;
  margenPorcentaje: number;
  valorInventarioEstimado: number;
  ultimaCompra: string | null;
  ultimaVenta: string | null;
  diasSinVenta: number;
  diasSinCompra: number;
  diasInventario: number | null;
  consumoPromedioDiario: number;
  rotacionMensual: number;
  diasAnalisis: number;
  fechaDesdeAnalisis: string;
  fechaHastaAnalisis: string;
  estadoRotacion: string;
  saludInventario: string;
  mensaje: string;
}

export interface ComprasInteligentesAlertasKpis {
  totalAlertasCriticas?: number;
  totalAlertasAltas?: number;
  totalAlertasMedias?: number;
  totalAlertasBajas?: number;
  tiposDiferentesAlerta?: number;
  tiposAlertaBase?: number;
  tiposAlertaAnalitica?: number;
  capitalTotalEnRiesgo?: number;
  productosAgotados?: number;
  riesgoRuptura?: number;
  sobreStock?: number;
  sobreStockAnalitico?: number;
  margenesNegativos?: number;
  altoCapitalInmovilizado?: number;
  totalAlertasInventario?: number;
  totalAlertasComerciales?: number;
  totalAlertasFinancieras?: number;
  alertasInventarioMinimo?: number;
  alertasInventarioMaximo?: number;
  alertasBajaRotacion?: number;
  alertasExcesoPermanencia?: number;
  scorePromedio?: number;
  riesgoOperacional?: number;
  riesgoFinanciero?: number;
  riesgoComercial?: number;
  riesgoMixto?: number;
  diasAnalisis?: number;
  fechaDesdeAnalisis?: string;
  fechaHastaAnalisis?: string;
  TotalAlertasCriticas?: number;
  TotalAlertasAltas?: number;
  TotalAlertasMedias?: number;
  TotalAlertasBajas?: number;
  TiposDiferentesAlerta?: number;
  TiposAlertaBase?: number;
  TiposAlertaAnalitica?: number;
  CapitalTotalEnRiesgo?: number;
  ProductosAgotados?: number;
  RiesgoRuptura?: number;
  SobreStock?: number;
  SobreStockAnalitico?: number;
  MargenesNegativos?: number;
  AltoCapitalInmovilizado?: number;
  TotalAlertasInventario?: number;
  TotalAlertasComerciales?: number;
  TotalAlertasFinancieras?: number;
  AlertasInventarioMinimo?: number;
  AlertasInventarioMaximo?: number;
  AlertasBajaRotacion?: number;
  AlertasExcesoPermanencia?: number;
  ScorePromedio?: number;
  RiesgoOperacional?: number;
  RiesgoFinanciero?: number;
  RiesgoComercial?: number;
  RiesgoMixto?: number;
  DiasAnalisis?: number;
  FechaDesdeAnalisis?: string;
  FechaHastaAnalisis?: string;
}

export interface ComprasInteligentesAlertasMetadata {
  totalRegistros: number;
  totalPaginas: number;
  paginaActual: number;
  registrosPorPagina: number;
  paginacionActiva: boolean;
  kpIs: ComprasInteligentesAlertasKpis;
}

export interface ComprasInteligentesAlertasResponse {
  success: boolean;
  message: string;
  data: ComprasInteligentesAlerta[];
  metadata: ComprasInteligentesAlertasMetadata;
}

export interface ComprasInteligentesAlertasFiltros {
  pageNumber?: number;
  pageSize?: number;
  codigoProducto?: string;
  codigoAlmacen?: string;
  linea?: string;
  categoria?: string;
  proveedor?: string;
  diasAnalisis?: number;
  diasSinVenta?: number;
  diasSobreStock?: number;
  diasCritico?: number;
  margenBajo?: number;
  capitalAlto?: number;
  filtroPrioridad?: string;
  filtroTipoAlerta?: string;
  filtroNivelImpacto?: string;
  registrarLog?: boolean;
  debug?: boolean;
}

export interface ComprasInteligentesProveedorOption {
  codigo: string;
  descripcion: string;
  ruc?: string;
}
