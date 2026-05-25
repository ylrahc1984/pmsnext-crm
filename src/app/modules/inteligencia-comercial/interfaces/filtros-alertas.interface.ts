import { PrioridadAlertaEnum } from '../enums/prioridad-alerta.enum';
import { TipoAlertaEnum } from '../enums/tipo-alerta.enum';

export interface FiltrosAlertasInventario {
  pageNumber?: number;
  pageSize?: number;

  /**
   * @deprecated DEPRECATED - utilizar filtroPrioridad.
   * Se mantiene por retrocompatibilidad con backend.
   */
  severidad?: string;
  codigoProducto?: string;
  codigoAlmacen?: string;
  categoria?: string;
  linea?: string;
  proveedor?: string;

  diasAnalisis?: number;
  diasSinVenta?: number;
  diasSobreStock?: number;
  diasCritico?: number;

  margenBajo?: number;
  capitalAlto?: number;

  filtroPrioridad?: PrioridadAlertaEnum | string;
  filtroTipoAlerta?: TipoAlertaEnum | string;

  registrarLog?: boolean;
  debug?: boolean;
}
