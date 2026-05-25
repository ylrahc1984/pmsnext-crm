export interface RecomendacionCompra {
  codProducto: string;
  nomProducto: string;

  codAlmacen: string;

  categoriaProducto: string;
  lineaProducto: string;

  codProveedorPrincipal: string;
  nomProveedorPrincipal: string;

  stockActual: number;
  stockMinimo: number;
  stockMaximo: number;

  diasCoberturaDeseada: number;
  diasCritico: number;
  leadTimeDias: number;

  cantidadConsumida: number;
  consumoPromedioDiario: number;

  diasInventario: number | null;
  rotacionMensual: number;

  estadoRotacion: string;
  saludInventario: string;

  ultimaCompra: string | null;
  ultimaVenta: string | null;

  diasSinVenta: number;
  diasSinCompra: number;

  ultimoCostoRegistrado: number;

  cantidadRecomendada: number;
  costoEstimadoCompra: number;

  prioridad: string;
  motivoCompra: string;

  fechaEstimadaAgotamiento: string | null;
  diasHastaAgotamiento: number;
}
