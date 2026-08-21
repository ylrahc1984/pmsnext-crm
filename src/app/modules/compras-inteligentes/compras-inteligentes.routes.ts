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
    path: 'inventario',
    loadComponent: () =>
      import('./pages/inventario/compras-inventario.component').then((c) => c.ComprasInventarioComponent)
  },
  {
    path: 'analisis',
    loadComponent: () =>
      import('./pages/analisis/compras-analisis-workspace.component').then((c) => c.ComprasAnalisisWorkspaceComponent)
  },
  {
    path: 'productos',
    redirectTo: 'analisis',
    pathMatch: 'full'
  },
  {
    path: 'productos-analisis',
    redirectTo: 'analisis',
    pathMatch: 'full'
  },
  {
    path: 'producto/:id',
    redirectTo: 'analisis'
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
    redirectTo: 'analisis',
    pathMatch: 'full'
  },
  {
    path: 'generar-pedido',
    loadComponent: () =>
      import('./pages/generar-pedido/compras-inteligentes-generar-pedido.component').then(
        (c) => c.ComprasInteligentesGenerarPedidoComponent
      )
  }
];
