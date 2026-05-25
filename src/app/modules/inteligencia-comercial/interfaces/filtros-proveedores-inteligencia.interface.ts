import { EstadoProveedorEnum } from '../enums/estado-proveedor.enum';
import { SemaforoProveedorEnum } from '../enums/semaforo-proveedor.enum';

export interface FiltrosProveedoresInteligencia {
  pageNumber?: number;
  pageSize?: number;

  /**
   * @deprecated DEPRECATED - utilizar filtroEstado.
   * Se mantiene unicamente por compatibilidad con backend.
   */
  clasificacion?: string;

  codigoProveedor?: string;
  codigoAlmacen?: string;
  categoria?: string;
  linea?: string;

  diasAnalisis?: number;
  fechaCorte?: string;

  filtroEstado?: EstadoProveedorEnum | string;
  filtroSemaforo?: SemaforoProveedorEnum | string;

  soloCriticos?: boolean;
  debug?: boolean;
}
