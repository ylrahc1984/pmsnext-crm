import { PrioridadCompraEnum } from '../enums/prioridad-compra.enum';

export interface FiltrosRecomendacionesCompra {
  pageNumber?: number;
  pageSize?: number;

  /**
   * @deprecated DEPRECATED - utilizar filtroPrioridad.
   * Se mantiene unicamente por compatibilidad con backend.
   */
  prioridad?: string;
  codigoProducto?: string;
  codigoAlmacen?: string;
  categoria?: string;
  linea?: string;
  proveedor?: string;

  diasAnalisis?: number;
  filtroPrioridad?: PrioridadCompraEnum | string;
  presupuestoMaximo?: number;
  incluirReposicionPreventiva?: boolean;
  debug?: boolean;
}
