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

  children?: NavigationItem[];
}
export const NavigationItems: NavigationItem[] = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    type: 'item',
    url: '/dashboard',
    icon: 'feather icon-home',
    classes: 'nav-item'
  },
  {
    id: 'main-navigation',
    title: 'NAVEGACION PRINCIPAL',
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
        id: 'ventas',
        title: 'VENTAS',
        type: 'collapse',
        icon: 'feather icon-shopping-cart',
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
            title: 'Órdenes',
            type: 'item',
            url: '/demo/ordenes-pedido',
            icon: 'feather icon-clipboard',
            classes: 'nav-item'
          }
        ]
      },
      {
        id: 'administracion',
        title: 'ADMINISTRACIÓN',
        type: 'collapse',
        icon: 'feather icon-settings',
        children: [
          {
            id: 'configuracion-sistema',
            title: 'Configuración',
            type: 'item',
            url: '/administracion/configuracion',
            icon: 'feather icon-sliders',
            classes: 'nav-item'
          },
          {
            id: 'usuarios',
            title: 'Usuarios',
            type: 'item',
            url: '/usuarios',
            icon: 'feather icon-user',
            classes: 'nav-item'
          }
        ]
      },
      {
        id: 'reportes',
        title: 'REPORTES',
        type: 'collapse',
        icon: 'feather icon-bar-chart-2',
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
  }
];
