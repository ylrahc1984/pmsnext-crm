export interface FiltrosRotacionInventario {
  pageNumber?: number;
  pageSize?: number;

  /**
   * @deprecated DEPRECATED - utilizar categoria.
   * Se mantiene por retrocompatibilidad con backend.
   */
  clasificacion?: string;
  codigoProducto?: string;
  codigoAlmacen?: string;
  categoria?: string;
  linea?: string;
  proveedor?: string;

  diasAnalisis?: number;
}
