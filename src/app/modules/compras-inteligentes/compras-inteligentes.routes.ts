import { Routes } from '@angular/router';

export const COMPRAS_INTELIGENTES_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./pages/dashboard/compras-inteligentes-dashboard.component').then((c) => c.ComprasInteligentesDashboardComponent)
  },
  {
    path: 'productos',
    loadComponent: () =>
      import('./pages/productos/compras-inteligentes-productos.component').then((c) => c.ComprasInteligentesProductosComponent)
  },
  {
    path: 'productos-analisis',
    loadComponent: () =>
      import('./pages/productos-analisis/compras-inteligentes-productos-analisis.component').then(
        (c) => c.ComprasInteligentesProductosAnalisisComponent
      )
  },
  {
    path: 'producto/:id',
    loadComponent: () =>
      import('./pages/producto-detalle/compras-inteligentes-producto-detalle.component').then(
        (c) => c.ComprasInteligentesProductoDetalleComponent
      )
  },
  {
    path: 'proveedores',
    loadComponent: () =>
      import('./pages/proveedores/compras-inteligentes-proveedores.component').then((c) => c.ComprasInteligentesProveedoresComponent)
  },
  {
    path: 'alertas',
    loadComponent: () => import('./pages/alertas/compras-inteligentes-alertas.component').then((c) => c.ComprasInteligentesAlertasComponent)
  },
  {
    path: 'recomendaciones',
    loadComponent: () =>
      import('./pages/recomendaciones/compras-inteligentes-recomendaciones.component').then(
        (c) => c.ComprasInteligentesRecomendacionesComponent
      )
  },
  {
    path: 'generar-pedido',
    loadComponent: () =>
      import('./pages/generar-pedido/compras-inteligentes-generar-pedido.component').then(
        (c) => c.ComprasInteligentesGenerarPedidoComponent
      )
  }
];
