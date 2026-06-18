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

  /**
   * @deprecated Usar SaludInventario para el endpoint de rotacion.
   */
  saludInventario?: string;

  /**
   * @deprecated Usar EstadoRotacion para el endpoint de rotacion.
   */
  estadoRotacion?: string;
  SaludInventario?: string;
  EstadoRotacion?: string;

  diasAnalisis?: number;
}
