import { Injectable, computed, signal } from '@angular/core';
import {
  AlertaInventario,
  EstadoInventario,
  KPIInventario,
  PedidoSugeridoItem,
  ProductoAnalitico,
  ProveedorAnalitico,
  RecomendacionCompra
} from '../interfaces/compras-inteligentes.models';

@Injectable({ providedIn: 'root' })
export class ComprasInteligentesDataService {
  private readonly productosState = signal<ProductoAnalitico[]>(this.createProductos());
  private readonly proveedoresState = signal<ProveedorAnalitico[]>(this.createProveedores());
  private readonly alertasState = signal<AlertaInventario[]>(this.createAlertas());
  private readonly recomendacionesState = signal<RecomendacionCompra[]>(this.createRecomendaciones());

  readonly productos = this.productosState.asReadonly();
  readonly proveedores = this.proveedoresState.asReadonly();
  readonly alertas = this.alertasState.asReadonly();
  readonly recomendaciones = this.recomendacionesState.asReadonly();

  readonly productosCriticos = computed(() => this.productos().filter((producto) => producto.estado === 'critico'));
  readonly productosEnRiesgo = computed(() => this.productos().filter((producto) => producto.estado !== 'saludable'));
  readonly productosSinRotacion = computed(() => this.productos().filter((producto) => producto.rotacion.unidadesVendidas === 0));
  readonly pedidoSugerido = computed<PedidoSugeridoItem[]>(() =>
    this.productos()
      .filter((producto) => producto.compraSugerida > 0 || producto.estado === 'critico')
      .map((producto) => ({
        productoId: producto.id,
        producto: producto.nombre,
        proveedor: producto.proveedor,
        stockActual: producto.stockActual,
        rotacionDias: producto.rotacion.diasPromedio,
        cantidadSugerida: producto.compraSugerida,
        cantidadAprobada: producto.compraSugerida,
        costoEstimado: producto.compraSugerida * producto.costoPromedio,
        estado: producto.estado
      }))
  );

  readonly kpis = computed<KPIInventario[]>(() => {
    const productos = this.productos();
    const inventarioTotal = productos.reduce((acc, producto) => acc + producto.stockActual * producto.costoPromedio, 0);
    const inventarioRiesgo = this.productosEnRiesgo().reduce((acc, producto) => acc + producto.riesgoFinanciero.montoRiesgo, 0);
    const rotacionPromedio = Math.round(productos.reduce((acc, producto) => acc + producto.rotacion.diasPromedio, 0) / productos.length);
    const compraSugeridaTotal = this.pedidoSugerido().reduce((acc, item) => acc + item.costoEstimado, 0);

    return [
      {
        id: 'inventario-total',
        label: 'Inventario Total',
        value: this.formatCurrency(inventarioTotal),
        subtitle: `${productos.length} productos monitoreados`,
        trend: '+4.8%',
        icon: 'feather icon-package',
        tone: 'info'
      },
      {
        id: 'inventario-riesgo',
        label: 'Inventario en Riesgo',
        value: this.formatCurrency(inventarioRiesgo),
        subtitle: 'Capital atrapado o con baja salida',
        trend: '-8.2%',
        icon: 'feather icon-alert-triangle',
        tone: 'danger'
      },
      {
        id: 'rotacion-promedio',
        label: 'Rotacion Promedio',
        value: `${rotacionPromedio} dias`,
        subtitle: 'Promedio ponderado operativo',
        trend: '+3 dias',
        icon: 'feather icon-refresh-cw',
        tone: 'warning'
      },
      {
        id: 'productos-criticos',
        label: 'Productos Criticos',
        value: this.productosCriticos().length,
        subtitle: 'Requieren decision inmediata',
        trend: 'Alta prioridad',
        icon: 'feather icon-zap',
        tone: 'danger'
      },
      {
        id: 'sin-rotacion',
        label: 'Productos sin Rotacion',
        value: this.productosSinRotacion().length,
        subtitle: 'Sin ventas recientes',
        trend: 'Bloqueo caja',
        icon: 'feather icon-pause-circle',
        tone: 'warning'
      },
      {
        id: 'compra-sugerida',
        label: 'Compra Sugerida Total',
        value: this.formatCurrency(compraSugeridaTotal),
        subtitle: 'Basada en minimo, maximo y rotacion',
        trend: 'Optimizada',
        icon: 'feather icon-shopping-bag',
        tone: 'success'
      }
    ];
  });

  productoPorId(id: string | null): ProductoAnalitico | undefined {
    return this.productos().find((producto) => producto.id === id);
  }

  formatCurrency(value: number): string {
    return `CRC ${new Intl.NumberFormat('es-CR', { maximumFractionDigits: 0 }).format(value || 0)}`;
  }

  toneForEstado(estado: EstadoInventario): 'success' | 'warning' | 'danger' {
    return estado === 'saludable' ? 'success' : estado === 'riesgo' ? 'warning' : 'danger';
  }

  private createProductos(): ProductoAnalitico[] {
    return [
      this.producto('p-100', 'Galleta Pozuelo Soda', 'Abarrotes', 'Distribuidora Central', 420, 90, 260, 780, 42, -12, 18, 35, 30, 'critico', 0, 'Detener compra y liquidar excedente'),
      this.producto('p-101', 'Cafe Britt Molido 500g', 'Bebidas', 'Britt Costa Rica', 36, 40, 120, 2650, 19, 8, 122, 14, 45, 'riesgo', 84, 'Reponer hasta stock maximo'),
      this.producto('p-102', 'Arroz Tio Pelon 1kg', 'Abarrotes', 'Mayorista Pacifico', 88, 70, 210, 610, 12, 14, 260, 9, 30, 'saludable', 90, 'Comprar lote controlado'),
      this.producto('p-103', 'Detergente Industrial 5L', 'Limpieza', 'Quimicos del Norte', 190, 35, 85, 3850, 63, -22, 0, 58, 30, 'critico', 0, 'Bloquear compra por sobreinventario'),
      this.producto('p-104', 'Jugo Natural Naranja', 'Bebidas', 'Tropical Fresh', 22, 55, 160, 950, 8, 18, 430, 6, 15, 'critico', 138, 'Generar pedido urgente'),
      this.producto('p-105', 'Servilleta Premium 500u', 'Operacion', 'Papeles Delta', 75, 60, 180, 1450, 27, -4, 64, 24, 30, 'saludable', 72, 'Reponer de forma gradual'),
      this.producto('p-106', 'Aceite Vegetal 5L', 'Cocina', 'Alimentos Uno', 48, 45, 110, 4200, 33, -8, 32, 31, 21, 'riesgo', 28, 'Negociar credito antes de comprar'),
      this.producto('p-107', 'Chocolate Barra 80g', 'Dulceria', 'Confites Nacionales', 310, 60, 170, 520, 71, -28, 0, 68, 30, 'critico', 0, 'Promocionar y pausar recompra')
    ];
  }

  private producto(
    id: string,
    nombre: string,
    categoria: string,
    proveedor: string,
    stockActual: number,
    stockMinimo: number,
    stockMaximo: number,
    costoPromedio: number,
    diasRotacion: number,
    tendencia: number,
    ventasUltimos30Dias: number,
    diasInventario: number,
    creditoProveedorDias: number,
    estado: EstadoInventario,
    compraSugerida: number,
    accionRecomendada: string
  ): ProductoAnalitico {
    const diferenciaDias = diasRotacion - creditoProveedorDias;
    return {
      id,
      nombre,
      categoria,
      proveedor,
      stockActual,
      stockMinimo,
      stockMaximo,
      costoPromedio,
      rotacion: {
        diasPromedio: diasRotacion,
        tendencia,
        ventasUltimos30Dias,
        unidadesVendidas: ventasUltimos30Dias
      },
      diasInventario,
      creditoProveedorDias,
      estado,
      accionRecomendada,
      compraSugerida,
      riesgoFinanciero: {
        diasRotacion,
        diasCreditoProveedor: creditoProveedorDias,
        diferenciaDias,
        montoRiesgo: Math.max(0, stockActual - stockMaximo) * costoPromedio + Math.max(0, diferenciaDias) * costoPromedio * 8,
        estado,
        mensaje: diferenciaDias > 0 ? 'La rotacion supera el credito del proveedor' : 'Credito cubre la rotacion estimada'
      }
    };
  }

  private createProveedores(): ProveedorAnalitico[] {
    return [
      { id: 's-1', nombre: 'Distribuidora Central', productos: 18, creditoDias: 30, inventarioRiesgo: 11, montoRiesgo: 1260000, cumplimiento: 92, estado: 'critico' },
      { id: 's-2', nombre: 'Britt Costa Rica', productos: 9, creditoDias: 45, inventarioRiesgo: 2, montoRiesgo: 240000, cumplimiento: 97, estado: 'saludable' },
      { id: 's-3', nombre: 'Quimicos del Norte', productos: 7, creditoDias: 30, inventarioRiesgo: 5, montoRiesgo: 980000, cumplimiento: 86, estado: 'critico' },
      { id: 's-4', nombre: 'Alimentos Uno', productos: 14, creditoDias: 21, inventarioRiesgo: 4, montoRiesgo: 520000, cumplimiento: 89, estado: 'riesgo' }
    ];
  }

  private createAlertas(): AlertaInventario[] {
    return [
      { id: 'a-1', tipo: 'sobreinventario', productoId: 'p-100', producto: 'Galleta Pozuelo Soda', titulo: 'Sobreinventario detectado', descripcion: 'Stock actual supera el maximo y rota en 42 dias.', prioridad: 'alta', estado: 'critico', timestamp: 'Hace 12 min', accionRapida: 'Pausar compra' },
      { id: 'a-2', tipo: 'baja-rotacion', productoId: 'p-103', producto: 'Detergente Industrial 5L', titulo: 'Producto sin salida reciente', descripcion: 'No registra ventas en los ultimos 30 dias.', prioridad: 'alta', estado: 'critico', timestamp: 'Hace 28 min', accionRapida: 'Revisar consumo' },
      { id: 'a-3', tipo: 'inventario-minimo', productoId: 'p-104', producto: 'Jugo Natural Naranja', titulo: 'Inventario bajo minimo', descripcion: 'Stock actual 22 contra minimo operativo de 55.', prioridad: 'alta', estado: 'critico', timestamp: 'Hace 41 min', accionRapida: 'Generar pedido' },
      { id: 'a-4', tipo: 'dias-permitidos', productoId: 'p-106', producto: 'Aceite Vegetal 5L', titulo: 'Riesgo financiero por credito', descripcion: 'Rotacion 33 dias contra credito proveedor de 21 dias.', prioridad: 'media', estado: 'riesgo', timestamp: 'Hoy 08:10', accionRapida: 'Negociar credito' },
      { id: 'a-5', tipo: 'inventario-maximo', productoId: 'p-107', producto: 'Chocolate Barra 80g', titulo: 'Producto excede dias permitidos', descripcion: 'Inventario cubre 68 dias de demanda esperada.', prioridad: 'media', estado: 'critico', timestamp: 'Ayer 17:20', accionRapida: 'Liquidar stock' }
    ];
  }

  private createRecomendaciones(): RecomendacionCompra[] {
    return [
      { id: 'r-1', productoId: 'p-100', titulo: 'Reducir compra de Galleta Pozuelo', problema: 'Producto tarda 42 dias en rotar y el credito es de 30 dias.', accion: 'Pausar recompra por dos ciclos y activar salida promocional.', impactoFinanciero: 620000, prioridad: 'alta', estado: 'critico' },
      { id: 'r-2', productoId: 'p-104', titulo: 'Generar pedido urgente de Jugo Natural', problema: 'Stock por debajo del minimo y alta salida diaria.', accion: 'Comprar 138 unidades y revisar proveedor alterno.', impactoFinanciero: 131100, prioridad: 'alta', estado: 'critico' },
      { id: 'r-3', productoId: 'p-106', titulo: 'Negociar credito para Aceite Vegetal', problema: 'El plazo credito es menor a la rotacion esperada.', accion: 'Solicitar credito de 35 dias o reducir lote aprobado.', impactoFinanciero: 336000, prioridad: 'media', estado: 'riesgo' },
      { id: 'r-4', productoId: 'p-103', titulo: 'Bloquear nuevas compras de Detergente', problema: 'Sin rotacion reciente y stock 223% sobre maximo.', accion: 'Congelar pedidos y reasignar consumo interno.', impactoFinanciero: 840000, prioridad: 'alta', estado: 'critico' }
    ];
  }
}
