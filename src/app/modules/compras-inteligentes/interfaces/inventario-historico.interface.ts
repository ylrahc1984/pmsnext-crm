export interface InventarioHistoricoRegistro {
  fechaDesde: string;
  fechaHasta: string;
  codAlmacen: string;
  almacen: string;
  codProducto: string;
  producto: string;
  unidadMedida: string;
  fechaInventarioBase: string;
  stockInventarioBase: number;
  movimientoAnteriorPeriodo: number;
  stockInicialPeriodo: number;
  comprasPeriodo: number;
  ncComprasPeriodo: number;
  entradasPeriodo: number;
  ncVentasPeriodo: number;
  ajustesPositivosPeriodo: number;
  ventasPeriodo: number;
  salidasPeriodo: number;
  produccionPeriodo: number;
  ajustesNegativosPeriodo: number;
  movimientoPeriodo: number;
  stockFinalPeriodo: number;
  costoReferencia: number;
  valorInventarioInicial: number;
  valorInventarioFinal: number;
  variacionUnidades: number;
  variacionValor: number;
}

export interface InventarioHistoricoPaginacion {
  pageNumber: number;
  pageSize: number;
  totalRows: number;
  totalPages: number;
}

export interface InventarioHistoricoResponse {
  paginacion: InventarioHistoricoPaginacion;
  datos: InventarioHistoricoRegistro[];
}

export interface InventarioHistoricoRequest {
  fechaDesde: string;
  fechaHasta: string;
  codAlmacen: string;
  codProveedor?: string;
  pageNumber: number;
  pageSize: number;
}
