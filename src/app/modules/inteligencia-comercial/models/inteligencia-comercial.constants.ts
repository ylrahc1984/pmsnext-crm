export const INTELIGENCIA_COMERCIAL_API_PATH = 'v1/inteligencia-comercial';

export const INTELIGENCIA_COMERCIAL_ENDPOINTS = {
  productos: 'productos',
  rotacion: 'rotacion',
  alertas: 'alertas',
  recomendacionesCompra: 'recomendaciones-compra',
  flujoCaja: 'flujo-caja',
  proveedores: 'proveedores'
} as const;

export const INTELIGENCIA_COMERCIAL_DEFAULT_PAGINATION = {
  pageNumber: 1,
  pageSize: 25
} as const;
