import { ErpStatusTone } from 'src/app/theme/shared/components/erp-status-badge/erp-status-badge.component';

export type EstadoInventario = 'saludable' | 'riesgo' | 'critico';
export type PrioridadAlerta = 'alta' | 'media' | 'baja';
export type TipoAlertaInventario = 'sobreinventario' | 'baja-rotacion' | 'inventario-minimo' | 'inventario-maximo' | 'dias-permitidos';

export interface RiesgoFinanciero {
  diasRotacion: number;
  diasCreditoProveedor: number;
  diferenciaDias: number;
  montoRiesgo: number;
  estado: EstadoInventario;
  mensaje: string;
}

export interface RotacionProducto {
  diasPromedio: number;
  tendencia: number;
  ventasUltimos30Dias: number;
  unidadesVendidas: number;
}

export interface ProductoAnalitico {
  id: string;
  nombre: string;
  categoria: string;
  proveedor: string;
  stockActual: number;
  stockMinimo: number;
  stockMaximo: number;
  costoPromedio: number;
  rotacion: RotacionProducto;
  diasInventario: number;
  creditoProveedorDias: number;
  estado: EstadoInventario;
  accionRecomendada: string;
  compraSugerida: number;
  riesgoFinanciero: RiesgoFinanciero;
}

export interface AlertaInventario {
  id: string;
  tipo: TipoAlertaInventario;
  tipoAlerta?: string;
  productoId: string;
  producto: string;
  titulo: string;
  descripcion: string;
  prioridad: PrioridadAlerta;
  estado: EstadoInventario;
  timestamp: string;
  accionRapida: string;
  codAlmacen?: string;
  categoriaProducto?: string;
  lineaProducto?: string;
  codProveedorPrincipal?: string;
  nomProveedorPrincipal?: string;
  stockActual?: number;
  ventaNeta?: number;
  utilidadBrutaTotal?: number;
  margenPorcentaje?: number;
  valorInventarioEstimado?: number;
  diasSinVenta?: number;
  diasInventario?: number;
  consumoPromedioDiario?: number;
  estadoRotacion?: string;
  saludInventario?: string;
}

export interface KPIInventario {
  id: string;
  label: string;
  value: string | number;
  subtitle: string;
  trend: string;
  icon: string;
  tone: ErpStatusTone;
}

export interface RecomendacionCompra {
  id: string;
  productoId?: string;
  titulo: string;
  problema: string;
  accion: string;
  impactoFinanciero: number;
  prioridad: PrioridadAlerta;
  estado: EstadoInventario;
}

export interface ProveedorAnalitico {
  id: string;
  nombre: string;
  productos: number;
  creditoDias: number;
  inventarioRiesgo: number;
  montoRiesgo: number;
  cumplimiento: number;
  estado: EstadoInventario;
}

export interface PedidoSugeridoItem {
  productoId: string;
  producto: string;
  proveedor: string;
  stockActual: number;
  rotacionDias: number;
  cantidadSugerida: number;
  cantidadAprobada: number;
  costoEstimado: number;
  estado: EstadoInventario;
}
