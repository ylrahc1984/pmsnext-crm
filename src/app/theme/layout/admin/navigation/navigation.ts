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
    id: 'inicio',
    title: 'INICIO',
    type: 'group',
    children: [
      {
        id: 'resumen-ejecutivo',
        title: 'Resumen ejecutivo',
        type: 'item',
        url: '/dashboard',
        icon: 'feather icon-home',
        classes: 'nav-item'
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
            icon: 'feather icon-trending-up',
            classes: 'nav-item'
          }
        ]
      }
    ]
  },
  {
    id: 'abastecimiento',
    title: 'ABASTECIMIENTO',
    type: 'group',
    children: [
      {
        id: 'compras',
        title: 'Compras',
        type: 'collapse',
        icon: 'feather icon-shopping-cart',
        children: [
          {
            id: 'compras-resumen',
            title: 'Resumen',
            type: 'item',
            url: '/compras-inteligentes/dashboard',
            icon: 'feather icon-grid',
            classes: 'nav-item'
          },
          {
            id: 'compras-analisis',
            title: 'Análisis',
            type: 'item',
            url: '/compras-inteligentes/analisis',
            icon: 'feather icon-bar-chart-2',
            classes: 'nav-item'
          },
          {
            id: 'compras-alertas',
            title: 'Alertas de inventario',
            type: 'item',
            url: '/compras-inteligentes/alertas',
            icon: 'feather icon-alert-triangle',
            classes: 'nav-item'
          },
          {
            id: 'compras-pedido-inteligente',
            title: 'Pedido inteligente',
            type: 'item',
            url: '/compras-inteligentes/generar-pedido',
            icon: 'feather icon-clipboard',
            classes: 'nav-item'
          }
        ]
      }
    ]
  },
  {
    id: 'maestros',
    title: 'MAESTROS',
    type: 'group',
    children: [
      {
        id: 'maestros-clientes',
        title: 'Clientes',
        type: 'item',
        url: '/catalogos/clientes',
        icon: 'feather icon-user-check',
        classes: 'nav-item'
      },
      {
        id: 'maestros-proveedores',
        title: 'Proveedores',
        type: 'item',
        url: '/compras/proveedores',
        icon: 'feather icon-briefcase',
        classes: 'nav-item'
      },
      {
        id: 'maestros-servicios',
        title: 'Servicios',
        type: 'item',
        url: '/catalogos/servicios',
        icon: 'feather icon-layers',
        classes: 'nav-item'
      },
      {
        id: 'maestros-listas-precios',
        title: 'Listas de precios',
        type: 'item',
        url: '/catalogos/listas-precios',
        icon: 'feather icon-tag',
        classes: 'nav-item'
      }
    ]
  },
  {
    id: 'administracion',
    title: 'ADMINISTRACIÓN',
    type: 'group',
    children: [
      {
        id: 'configuracion-sistema',
        title: 'Configuración del sistema',
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
        icon: 'feather icon-shield',
        classes: 'nav-item'
      }
    ]
  }
];
