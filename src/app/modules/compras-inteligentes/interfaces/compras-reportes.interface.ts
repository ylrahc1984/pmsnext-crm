export type ReporteValor = string | number | boolean | null;

export interface ReporteFila {
  readonly [campo: string]: ReporteValor;
}

export interface ComprasAnalisisFiltros {
  fechaDesde: string;
  fechaHasta: string;
  codProveedor: string;
  proveedorNombre?: string;
  codProducto?: string;
  almacen?: string;
  proveedorHistorico: boolean;
}

export interface AnaliticoVentasProveedorRequest {
  fechaDesde: string;
  fechaHasta: string;
  codProveedor: string;
  codProducto?: string;
  almacen?: string;
  proveedorHistorico: number;
}

export interface ComprasReporteResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface AnaliticoComprasProveedorRequest {
  fechaDesde: string;
  fechaHasta: string;
  codProveedor: string;
  codProducto?: string;
  almacen?: string;
}

export interface RotacionProductosRequest {
  fechaDesde: string;
  fechaHasta: string;
  codProveedor: string;
  codProducto?: string;
}

export interface ProductosSinMovimientoRequest {
  fechaCorte: string;
  diasAlerta: number;
  codProveedor: string;
  codProducto?: string;
}

export type EstadoAlertaProducto = 'ALERTA' | 'SIN VENTAS';
export type AlertaSeveridad = 'RECIENTE' | 'ATENCION' | 'CRITICA' | 'MUY_CRITICA' | 'SIN_HISTORIAL';

// El backend entrega listas planas. Sus columnas analiticas completas no estan
// publicadas en este repositorio; se mantienen como registros tipados sin usar any.
export interface AnaliticoVentasProveedor {
  fechaDesde: string;
  fechaHasta: string;
  diasPeriodo: number;
  fechaDesdeAnterior: string;
  fechaHastaAnterior: string;
  codProveedor: string;
  proveedor: string;
  codProducto: string;
  producto: string;
  unidadMedida: string;
  cantidadBruta: number;
  cantidadNC: number;
  cantidadNeta: number;
  ventaBruta: number;
  montoNC: number;
  ventaNeta: number;
  costoNeto: number;
  margenNeto: number;
  margenPorcentaje: number | null;
  promedioDiario: number;
  diasConVenta: number;
  frecuenciaVenta: number;
  ultimaVenta: string | null;
  diasDesdeUltimaVenta: number | null;
  cantidadAnterior: number;
  ventaAnterior: number;
  margenAnterior: number;
  diasConVentaAnterior: number;
  variacionCantidad: number | null;
  variacionVenta: number | null;
  estadoComparativo: string;
  participacionProveedor: number;
}

export interface VentasProveedorResumen {
  ventasNetas: number;
  unidadesVendidas: number;
  margenNeto: number;
  margenPorcentajeGlobal: number | null;
  totalProductos: number;
  productosConVenta: number;
  productosSinVenta: number;
  productosCreciendo: number;
  productosDisminuyendo: number;
  productosSinVentaActual: number;
}
export interface AnaliticoComprasProveedor {
  fechaDesde: string;
  fechaHasta: string;
  diasPeriodo: number;
  fechaDesdeAnterior: string;
  fechaHastaAnterior: string;
  codProveedor: string;
  proveedor: string;
  codProducto: string;
  producto: string;
  unidadMedida: string;
  cantidadComprada: number;
  netoComprado: number;
  impuestoComprado: number;
  totalComprado: number;
  costoTotalAdquirido: number;
  costoPromedio: number | null;
  costoMinimo: number | null;
  costoMaximo: number | null;
  ultimoCosto: number | null;
  numeroCompras: number;
  diasConCompra: number;
  cantidadPromedioCompra: number | null;
  primeraCompra: string | null;
  ultimaCompra: string | null;
  diasDesdeUltimaCompra: number | null;
  cantidadAnterior: number;
  netoAnterior: number;
  totalAnterior: number;
  costoTotalAnterior: number;
  costoPromedioAnterior: number | null;
  costoMinimoAnterior: number | null;
  costoMaximoAnterior: number | null;
  ultimoCostoAnterior: number | null;
  numeroComprasAnterior: number;
  diasConCompraAnterior: number;
  ultimaCompraAnterior: string | null;
  variacionCantidad: number | null;
  variacionNeto: number | null;
  variacionTotal: number | null;
  variacionCostoPromedio: number | null;
  variacionUltimoCosto: number | null;
  estadoComparativo: string;
  participacionProveedor: number;
}

export interface ComprasProveedorResumen {
  netoComprado: number;
  netoAnterior: number;
  unidadesCompradas: number;
  productosComprados: number;
  productosSinCompra: number;
  totalProductos: number;
  variacionCompraGlobal: number | null;
  comparacionCompra: 'comparable' | 'nueva' | 'sin-datos';
  impuestos: number;
  compraTotal: number;
  numeroCompras: number;
}

export interface CompraEstadoResumen {
  estado: string;
  etiqueta: string;
  cantidad: number;
  tone: 'info' | 'warning' | 'neutral' | 'success';
  icono: string;
}

export interface CompraCambioRelevante {
  codProducto: string;
  producto: string;
  tipo: string;
  detalle: string;
  variacion: number | null;
  tone: 'info' | 'warning' | 'neutral';
  relevancia: number;
}
export type NivelRotacion = 'MUY RAPIDA' | 'RAPIDA' | 'NORMAL' | 'LENTA' | 'MUY LENTA' | 'SIN DATOS';

export interface RotacionProducto {
  fechaDesde: string;
  fechaHasta: string;
  diasPeriodo: number;
  codProveedor: string;
  codProducto: string;
  producto: string;
  cantidadVendida: number;
  fechaCompraMasAntigua: string | null;
  fechaCompraMasReciente: string | null;
  diasPromedioInventario: number | null;
  diasMinimoInventario: number | null;
  diasMaximoInventario: number | null;
  fechaUltimaVenta: string | null;
  diasInventarioUltimaVenta: number | null;
  existenciaActual: number;
  nivelRotacion: NivelRotacion;
}

export interface RotacionResumen {
  productosAnalizados: number;
  unidadesVendidas: number;
  productosLentos: number;
  productosRapidos: number;
  productosMuyLentos: number;
  productosStockNegativo: number;
}

export interface RotacionDistribucion {
  nivel: NivelRotacion;
  cantidad: number;
  porcentaje: number;
  tone: 'success' | 'info' | 'neutral' | 'warning' | 'danger';
}

export interface RotacionHallazgo {
  tipo: string;
  mensaje: string;
  tone: 'success' | 'info' | 'warning' | 'danger';
  icono: string;
}

export interface ProductoSinMovimiento {
  fechaCorte: string;
  codProveedor: string;
  codProducto: string;
  producto: string;
  unidadMedida: string;
  existencia: number;
  fechaUltimaVenta: string | null;
  diasSinVenta: number | null;
  diasAlerta: number;
  diasExceso: number | null;
  estadoAlerta: EstadoAlertaProducto;
}

export type EstadoConsulta = 'initial' | 'loading' | 'data' | 'empty' | 'error';
