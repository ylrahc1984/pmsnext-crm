export interface FiltrosProductos {
  pageNumber?: number;
  pageSize?: number;
  categoria?: string;
  codigoProducto?: string;
  codigoAlmacen?: string;
  estadoProducto?: string;
  linea?: string;
  proveedor?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}
