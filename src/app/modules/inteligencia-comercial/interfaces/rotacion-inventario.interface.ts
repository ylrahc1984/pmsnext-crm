export interface RotacionInventario {
  codProducto: string;
  nomProducto: string;

  codAlmacen: string;

  categoriaProducto: string;
  lineaProducto: string;

  codProveedorPrincipal: string;
  nomProveedorPrincipal: string;

  stockActual: number;

  cantidadConsumida: number;

  diasAnalizados: number;

  consumoPromedioDiario: number;

  diasInventario: number;

  rotacionMensual: number;

  diasCreditoProveedor?: number;

  margenDiasFinanciero?: number;

  estadoRotacion: string;

  saludInventario: string;
}
