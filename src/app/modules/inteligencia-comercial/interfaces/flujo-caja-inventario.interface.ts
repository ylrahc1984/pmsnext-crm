export interface FlujoCajaInventario {
  codProducto: string;
  nomProducto: string;

  codAlmacen: string;

  categoriaProducto: string;
  lineaProducto: string;

  codProveedorPrincipal: string;
  nomProveedorPrincipal: string;

  stockActual: number;

  valorInventarioEstimado: number;

  ventaNeta: number;
  utilidadBrutaTotal: number;
  margenPorcentaje: number;

  compraNetaValor: number;
  compraNetaCantidad: number;

  ultimaCompraReal: string | null;
  ultimaVenta: string | null;

  diasSinVenta: number;
  diasSinCompra: number;

  cantidadConsumida: number;
  consumoPromedioDiario: number;

  diasInventario: number;
  rotacionMensual: number;

  diasCreditoPromedio: number;
  diasCreditoUltimaCompra: number;

  margenDiasCaja: number;
  diasDesfaseCaja: number;

  capitalEnRiesgo: number;

  estadoFlujoCaja: string;
  semaforoFlujoCaja: string;

  mensajeEjecutivo: string;
}
