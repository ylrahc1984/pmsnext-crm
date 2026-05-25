export interface AlertaInventario {
  tipoAlerta: string;
  prioridad: string;

  codProducto: string;
  nomProducto: string;

  codAlmacen: string;

  categoriaProducto: string;
  lineaProducto: string;

  codProveedorPrincipal: string;
  nomProveedorPrincipal: string;

  stockActual: number;

  ventaNeta: number;

  utilidadBrutaTotal: number;

  margenPorcentaje: number;

  valorInventarioEstimado: number;

  diasSinVenta: number;

  diasInventario: number;

  consumoPromedioDiario: number;

  estadoRotacion: string;

  saludInventario: string;

  mensaje: string;
}
