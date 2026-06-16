export type EstadoInventarioDashboard = 'CRITICO' | 'RIESGO' | 'NORMAL' | 'SIN_STOCK' | 'SIN_ROTACION' | 'SOBRESTOCK' | string;
export type NivelRiesgoDashboard = 'ALTO' | 'MEDIO' | 'BAJO' | string;

export interface DashboardInventarioFiltros {
  codAlmacen: string;
  topProductosCriticos: number;
  topProveedores: number;
  topCategorias: number;
  topAcciones: number;
}

export interface DashboardInventarioDto {
  kpis: DashboardKpisDto;
  accionesRecomendadas: AccionRecomendadaDto[];
  productosCriticos: ProductoCriticoDto[];
  proveedores: ProveedorDashboardDto[];
  categorias: CategoriaDashboardDto[];
  estados: EstadoInventarioDto[];
}

export interface DashboardKpisDto {
  totalProductos: number;
  valorInventarioTotal: number;
  productosCriticos: number;
  productosRiesgo: number;
  productosSinStock: number;
  productosSinRotacion: number;
  productosSobreStock: number;
  compraSugeridaTotal: number;
  capitalComprometido: number;
  diasInventarioPromedio: number;
  fechaUltimaActualizacion: string;
}

export interface AccionRecomendadaDto {
  codProducto: string;
  nomProducto: string;
  codAlmacen: string;
  nomAlmacen: string;
  codProveedorPrincipal: string | null;
  nomProveedorPrincipal: string | null;
  estadoInventario: EstadoInventarioDashboard;
  nivelRiesgo: NivelRiesgoDashboard;
  stockActual: number;
  stockMinimo: number;
  stockMaximo: number;
  ventaPromedioDiaria: number;
  diasInventario: number;
  diasSinVenta: number;
  cantidadSugeridaCompra: number;
  montoSugeridoCompra: number;
  motivoAnalitica: string;
}

export interface ProductoCriticoDto {
  codProducto: string;
  nomProducto: string;
  codAlmacen: string;
  nomAlmacen: string;
  codProveedorPrincipal: string | null;
  nomProveedorPrincipal: string | null;
  stockActual: number;
  venta30Dias: number;
  venta60Dias: number;
  venta90Dias: number;
  ventaPromedioDiaria: number;
  diasInventario: number;
  diasSinVenta: number;
  valorInventario: number;
  montoSugeridoCompra: number;
  estadoInventario: EstadoInventarioDashboard;
  nivelRiesgo: NivelRiesgoDashboard;
}

export interface ProveedorDashboardDto {
  codProveedorPrincipal: string | null;
  nomProveedorPrincipal: string | null;
  cantidadProductos: number;
  valorInventarioTotal: number;
  capitalEnRiesgo: number;
  productosCriticos: number;
  productosRiesgo: number;
  productosSinRotacion: number;
  productosSobreStock: number;
}

export interface CategoriaDashboardDto {
  codCategoria: string | null;
  nomCategoria: string | null;
  cantidadProductos: number;
  diasInventarioPromedio: number;
  valorInventarioTotal: number;
  productosCriticos: number;
  productosRiesgo: number;
  productosSinRotacion: number;
  productosSobreStock: number;
}

export interface EstadoInventarioDto {
  estadoInventario: EstadoInventarioDashboard;
  cantidadProductos: number;
  valorInventarioTotal: number;
  compraSugeridaTotal: number;
}
