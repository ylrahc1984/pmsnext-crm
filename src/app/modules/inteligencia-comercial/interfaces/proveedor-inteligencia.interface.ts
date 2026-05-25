export interface ProveedorInteligencia {
  codProveedorPrincipal: string;
  nomProveedorPrincipal: string;

  productosComprados: number;
  categoriasAtendidas: number;
  almacenesAtendidos: number;

  totalMovimientosCompra: number;

  compraNeta: number;
  cantidadComprada: number;

  primeraCompra: string | null;
  ultimaCompra: string | null;

  diasSinCompra: number;

  diasCreditoPromedio: number;
  leadTimePromedio: number;

  ticketPromedioCompra: number;
  participacionCompraPorcentaje: number;

  nivelDependencia: string;
  estadoProveedor: string;
  semaforoProveedor: string;

  mensajeEjecutivo: string;
}
