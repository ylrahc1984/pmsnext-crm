export interface NavigationItem {
  id: string;
  title: string;
  type: 'item' | 'collapse' | 'group';
  translate?: string;
  icon?: string;
  hidden?: boolean;
  url?: string;
  classes?: string;
  exactMatch?: boolean;
  external?: boolean;
  target?: boolean;
  breadcrumbs?: boolean;
  locked?: boolean;
  lockedMessage?: string;

  children?: NavigationItem[];
}

export const NavigationItems: NavigationItem[] = [
  {
    id: 'operacion',
    title: 'OPERACION',
    type: 'group',
    children: [
      {
        id: 'dashboard',
        title: 'Dashboard',
        type: 'item',
        url: '/dashboard',
        icon: 'feather icon-grid',
        classes: 'nav-item'
      },
      {
        id: 'compras-inteligentes',
        title: 'Compras Inteligentes',
        type: 'collapse',
        icon: 'feather icon-cpu',
        children: [
          {
            id: 'compras-inteligentes-dashboard',
            title: 'Dashboard',
            type: 'item',
            url: '/compras-inteligentes/dashboard',
            icon: 'feather icon-grid',
            classes: 'nav-item'
          },
          {
            id: 'compras-inteligentes-productos',
            title: 'Productos',
            type: 'item',
            url: '/compras-inteligentes/productos',
            icon: 'feather icon-package',
            classes: 'nav-item'
          },
          {
            id: 'compras-inteligentes-productos-analisis',
            title: 'Analisis Productos',
            type: 'item',
            url: '/compras-inteligentes/productos-analisis',
            icon: 'feather icon-bar-chart-2',
            classes: 'nav-item'
          },
          {
            id: 'compras-inteligentes-proveedores',
            title: 'Proveedores',
            type: 'item',
            url: '/compras-inteligentes/proveedores',
            icon: 'feather icon-briefcase',
            classes: 'nav-item'
          },
          {
            id: 'compras-inteligentes-alertas',
            title: 'Alertas',
            type: 'item',
            url: '/compras-inteligentes/alertas',
            icon: 'feather icon-alert-triangle',
            classes: 'nav-item'
          },
          {
            id: 'compras-inteligentes-recomendaciones',
            title: 'Recomendaciones',
            type: 'item',
            url: '/compras-inteligentes/recomendaciones',
            icon: 'feather icon-cpu',
            classes: 'nav-item'
          },
          {
            id: 'compras-inteligentes-generar-pedido',
            title: 'Generar Pedido',
            type: 'item',
            url: '/compras-inteligentes/generar-pedido',
            icon: 'feather icon-shopping-cart',
            classes: 'nav-item'
          }
        ]
      },
      {
        id: 'inventario',
        title: 'Inventario',
        type: 'collapse',
        icon: 'feather icon-package',
        locked: true,
        lockedMessage: 'No se tiene acceso',
        children: [
          {
            id: 'inventario-productos',
            title: 'Productos',
            type: 'item',
            url: '/compras/producto-list',
            icon: 'feather icon-box',
            classes: 'nav-item'
          },
          {
            id: 'inventario-almacenes',
            title: 'Almacenes',
            type: 'item',
            url: '/compras/almacen',
            icon: 'feather icon-archive',
            classes: 'nav-item'
          },
          {
            id: 'inventario-configuracion',
            title: 'Configuracion',
            type: 'item',
            url: '/compras/configuracion',
            icon: 'feather icon-sliders',
            classes: 'nav-item'
          }
        ]
      },
      {
        id: 'ventas',
        title: 'Ventas',
        type: 'collapse',
        icon: 'feather icon-shopping-cart',
        locked: true,
        lockedMessage: 'No se tiene acceso',
        children: [
          {
            id: 'ventas-cotizaciones',
            title: 'Cotizaciones',
            type: 'item',
            url: '/ventas/cotizaciones',
            icon: 'feather icon-file-text',
            classes: 'nav-item'
          },
          {
            id: 'ventas-ordenes',
            title: 'Ordenes',
            type: 'item',
            url: '/demo/ordenes-pedido',
            icon: 'feather icon-layers',
            classes: 'nav-item'
          }
        ]
      }
    ]
  },
  {
    id: 'comercial',
    title: 'COMERCIAL',
    type: 'group',
    children: [
      {
        id: 'crm',
        title: 'CRM',
        type: 'collapse',
        icon: 'feather icon-users',
        children: [
          {
            id: 'crm-contactos',
            title: 'Contactos',
            type: 'item',
            url: '/crm/contactos',
            icon: 'feather icon-user',
            classes: 'nav-item'
          },
          {
            id: 'crm-oportunidades',
            title: 'Oportunidades',
            type: 'item',
            url: '/crm/oportunidades',
            icon: 'feather icon-target',
            classes: 'nav-item'
          },
          {
            id: 'crm-pipeline',
            title: 'Pipeline',
            type: 'item',
            url: '/crm/pipeline',
            icon: 'feather icon-activity',
            classes: 'nav-item'
          }
        ]
      },
      {
        id: 'catalogos-comerciales',
        title: 'Catalogos',
        type: 'collapse',
        icon: 'feather icon-folder',
        children: [
          {
            id: 'catalogos-clientes',
            title: 'Clientes',
            type: 'item',
            url: '/catalogos/clientes',
            icon: 'feather icon-briefcase',
            classes: 'nav-item'
          },
          {
            id: 'catalogos-servicios',
            title: 'Servicios',
            type: 'item',
            url: '/catalogos/servicios',
            icon: 'feather icon-list',
            classes: 'nav-item'
          },
          {
            id: 'catalogos-listas-precios',
            title: 'Listas de precios',
            type: 'item',
            url: '/catalogos/listas-precios',
            icon: 'feather icon-tag',
            classes: 'nav-item'
          }
        ]
      }
    ]
  },
  {
    id: 'finanzas',
    title: 'FINANZAS',
    type: 'group',
    children: [
      {
        id: 'finanzas-control',
        title: 'Control Financiero',
        type: 'collapse',
        icon: 'feather icon-credit-card',
        locked: true,
        lockedMessage: 'No se tiene acceso',
        children: [
          {
            id: 'cuentas-cobrar',
            title: 'Cuentas por cobrar',
            type: 'item',
            url: '/finanzas/cuentas-cobrar',
            icon: 'feather icon-arrow-down-circle',
            classes: 'nav-item'
          },
          {
            id: 'cuentas-pagar',
            title: 'Cuentas por pagar',
            type: 'item',
            url: '/finanzas/cuentas-pagar',
            icon: 'feather icon-arrow-up-circle',
            classes: 'nav-item'
          },
          {
            id: 'bancos',
            title: 'Bancos',
            type: 'item',
            url: '/finanzas/bancos',
            icon: 'feather icon-home',
            classes: 'nav-item'
          }
        ]
      },
      {
        id: 'reporteria',
        title: 'Reporteria',
        type: 'collapse',
        icon: 'feather icon-bar-chart-2',
        locked: true,
        lockedMessage: 'No se tiene acceso',
        children: [
          {
            id: 'reporte-finanzas',
            title: 'Finanzas',
            type: 'item',
            url: '/reportes/finanzas',
            icon: 'feather icon-trending-up',
            classes: 'nav-item'
          },
          {
            id: 'reporte-comercial',
            title: 'Comercial',
            type: 'item',
            url: '/reportes/comercial',
            icon: 'feather icon-dollar-sign',
            classes: 'nav-item'
          }
        ]
      }
    ]
  },
  {
    id: 'administracion',
    title: 'ADMINISTRACION',
    type: 'group',
    children: [
      {
        id: 'configuracion-sistema',
        title: 'Configuracion',
        type: 'item',
        url: '/administracion/configuracion',
        icon: 'feather icon-settings',
        classes: 'nav-item'
      },
      {
        id: 'usuarios',
        title: 'Usuarios',
        type: 'item',
        url: '/usuarios',
        icon: 'feather icon-user-check',
        classes: 'nav-item'
      }
    ]
  }
];
