export interface FiltrosFlujoCajaInventario {
  pageNumber?: number;
  pageSize?: number;

  /**
   * @deprecated DEPRECATED - utilizar fechaCorte + diasAnalisis.
   * Se mantiene unicamente por compatibilidad con backend.
   */
  fechaInicio?: string;

  /**
   * @deprecated DEPRECATED - utilizar fechaCorte + diasAnalisis.
   * Se mantiene unicamente por compatibilidad con backend.
   */
  fechaFin?: string;

  codigoProducto?: string;
  codigoAlmacen?: string;
  categoria?: string;
  linea?: string;
  proveedor?: string;

  diasAnalisis?: number;
  diasToleranciaRiesgo?: number;
  fechaCorte?: string;

  debug?: boolean;
}
