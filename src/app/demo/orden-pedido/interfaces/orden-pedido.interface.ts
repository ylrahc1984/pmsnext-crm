export interface OrdenPedidoFiltro {
  tipOrden        : string;
  estadoNDP      ?: string;
  fechaDesde      : string;
  fechaHasta      : string;
  codCliente      : string;
  nomCliente      : string;
  pageNumber      : number;
  pageSize        : number;
}

export interface OrdenPedidoPaginacion {
  totalRegistros    : number;
  paginaActual      : number;
  pageSize          : number;
  totalPaginas      : number;
}

export interface OrdenPedidoListadoItem {
  tipOrden            : string;
  serie               : string;
  numero              : string;
  fecha               : string;
  cliente             : string;
  ruc                 : string;
  items               : number;
  subtotal            : number;
  impuesto            : number;
  total               : number;
  estado              : string;
  observaciones       : string;
  operador            : string;
}

export interface OrdenPedidoListadoResponse {
  datos         : OrdenPedidoListadoItem[];
  paginacion    : OrdenPedidoPaginacion;
}

export interface OrdenPedidoDetalleItem {
  codProdu            : string;
  producto            : string;
  area                : string;
  uMedida             : string;
  canProdu            : number;
  pUndLst             : number;
  uniSinImp           : number;
  totSinImp           : number;
  porDescu            : number;
  mtoDescu            : number;
  totalNeto           : number;
  porImpu             : number;
  mtoImpu             : number;
  porExonera          : number;
  mtoExonera          : number;
  uniConImp           : number;
  mtoTotal            : number;
  grabado             : string;
  moneda              : string;
  tCambio             : number;
  orden               : number;
  uMedidaDos          : string;
  canProduDos         : number;
  lstPrecio           : string;
  planTarifa          : string;
}

export interface OrdenPedidoPagoItem {
  orden           : number;
  frmPago         : string;
  tipo            : string;
  numTarjeta      : string;
  referencia      : string;
  moneda          : string;
  monto           : number;
  montoOri        : number;
  tCambio         : number;
  vencimiento     : string;
  caja            : string;
  turno           : string;
}

export interface OrdenPedidoExoneracion {
  tipoDocumentoEX1      : string;
  numeroDocumento       : string;
  nombreInstitucion     : string;
  tarifaExonerada       : number;
  montoExoneracion      : number;
}

export interface OrdenPedidoExoneracionUpdate {
  tipoDocumentoEX1: string;
  tipoDocumentoOTRO: string;
  numeroDocumento: string;
  articulo: string;
  inciso: string;
  nombreInstitucion: string;
  nombreInstitucionOtros: string;
  fechaEmisionEX: string;
  tarifaExonerada: number;
  montoExoneracion: number;
}

export interface OrdenPedidoCreatePayload {
  proceso           : number;
  detalle           : OrdenPedidoDetalleItem[];
  formasPago        : OrdenPedidoPagoItem[];
  tipNDP            : string;
  serieNDP          : string;
  numeroNDP         : string;
  pntVenta          : string;
  fecNDP            : string;
  horaNDP           : string;
  codVendedor       : string;
  codCliente        : string;
  rucCliente        : string;
  nomCliente        : string;
  exento            : number;
  subTotal          : number;
  impuesto          : number;
  totDocu           : number;
  totalPago         : number;
  estadoNDP         : string;
  moneda            : string;
  tCambio           : number;
  fecVenc           : string;
  lstPrecio         : string;
  items             : number;
  nReferencia       : string;
  observaciones     : string;
  operador          : string;
  idBeep            : string;
  cActividad        : string;
  pageNumber        : number;
  pageSize          : number;
  respuesta         : string;
  exoneracion       ?: OrdenPedidoExoneracion | null;
  exoneraciones     ?: OrdenPedidoExoneracionUpdate[];
}

export interface OrdenPedidoCreateResponse {
  respuesta   ?: string;
  mensaje     ?: string;
  datos       ?: Array<{
    TipNDP    ?: string;
    Serie     ?: string;
    NumNDP    ?: string;
  }>;
}

export interface OrdenPedidoCompletoEncabezado {
  ppV05_TipNDP: string;
  ppV05_SerieNDP: string;
  ppV05_NumNDP: string;
  ppV05_PntVenta: string;
  ppV05_FecDocu: string;
  ppV05_HorDocu: string;
  ppV05_CodVendedor: string;
  ppV05_CodCliente: string;
  ppV05_RucCliente: string;
  ppV05_NomCliente: string;
  ppV05_DirCliente: string;
  ppV05_Exonerado: number;
  ppV05_SubTotal: number;
  ppV05_Impuesto: number;
  ppV05_TotalDocu: number;
  ppV05_TotalPago: number;
  ppV05_EstDocu: string;
  ppV05_Moneda: string;
  ppV05_TCambio: number;
  ppV05_FechaVen: string;
  ppV05_LPrecio: string;
  ppV05_Items: number;
  ppV05_NReferencia: string;
  ppV05_Observaciones: string;
  ppV05_Operador: string;
  ppV05_IdBee: string;
  ppV05_CActividad: string;
}

export interface OrdenPedidoCompletoDetalleItem {
  ppV06_TipNDP: string;
  ppV06_SerieNDP: string;
  ppV06_NumNDP: string;
  ppV06_CodProducto: string;
  ppV06_NomProducto: string;
  ppV06_Linea: string;
  ppV06_Categoria: string;
  ppV06_Cantidad: number;
  ppV06_UMedida: string;
  ppV06_PUndLst: number;
  ppV06_UniSinImp: number;
  ppV06_PrecioSinImp: number;
  ppV06_PorDescu: number;
  ppV06_Descuento: number;
  ppV06_TotalNeto: number;
  ppV06_PorImpuesto: number;
  ppV06_Impuestos: number;
  ppV06_PorExonera: number;
  ppV06_MtoExonera: number;
  ppV06_UniConImp: number;
  ppV06_Precio: number;
  ppV06_PrecioCosto: number;
  ppV06_Almacen: string;
  ppV06_Imponible: string;
  ppV06_Moneda: string;
  ppV06_TCambio: number;
  ppV06_Orden: number;
  ppV06_Operador: string;
  ppV06_CodLstPrecio: string;
  ppV06_PlanTarifario: string;
}

export interface OrdenPedidoCompletoFormaPagoItem {
  [key: string]: unknown;
}

export interface OrdenPedidoCompletoCliente {
  mpV00_CodClien: string;
  mpV00_NomClien: string;
  mpV00_RucClien: string;
  mpV00_Contacto: string;
  mpV00_DirClien: string;
  mpV00_PrvClien: string;
  mpV00_CiuClien: string;
  mpV00_PaiClien: string;
  mpV00_Zona: string;
  mpV00_Email: string;
  mpV00_Te1Clien: string;
  mpV00_Te2Clien: string;
  mpV00_FaxClien: string;
  mpV00_TipClien: string;
  mpV00_MtoCredito: number;
  mpV00_IdProvincia: string;
  mpV00_IdCanton: string;
  mpV00_IdDistrito: string;
  mpV00_TCliente: string;
  mpV00_BanderaCorreo: string;
  mpV00_Operador: string;
}

export interface OrdenPedidoCompletoResponse {
  encabezado: OrdenPedidoCompletoEncabezado;
  detalle: OrdenPedidoCompletoDetalleItem[];
  formasPago: OrdenPedidoCompletoFormaPagoItem[];
  cliente: OrdenPedidoCompletoCliente | null;
}
