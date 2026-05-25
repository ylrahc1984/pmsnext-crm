export interface ProductoAnalisis {
  codProducto: string;
  nomProducto: string;
  codAlmacen: string;
  categoriaProducto: string;
  lineaProducto: string;
  codProveedorPrincipal: string;
  nomProveedorPrincipal: string;

  stockAlInicioPeriodo: number;
  stockAlCierrePeriodo: number;
  stockActual: number;
  totalEntradas: number;
  totalSalidas: number;
  movimientoNetoPeriodo: number;
  cantidadTransaccionesVenta: number;
  cantidadUnidadesVendidas: number;

  ventaBruta: number;
  devolucionesVenta: number;
  ventaNeta: number;

  costoVentaTotal: number;
  utilidadBrutaTotal: number;
  margenPorcentaje: number;
  precioPromedio: number;

  ultimaEntradaPeriodo: string | null;
  ultimaSalidaPeriodo: string | null;
  ultimaCompraPeriodo: string | null;
  ultimaVentaPeriodo: string | null;
  ultimaEntrada: string | null;
  ultimaSalida: string | null;
  ultimaCompra: string | null;
  ultimaVenta: string | null;

  diasSinVenta: number | null;
  diasSinCompra: number | null;

  costoPromedio: number;
  ultimoCostoRegistrado: number;
  valorInventarioEstimado: number;

  estadoProducto: string;

  esAgotado: boolean;
  esProductoInactivo: boolean;
}
