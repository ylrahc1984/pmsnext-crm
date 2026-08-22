import { RangoTiempoRotacion } from '../interfaces/compras-reportes.interface';

export interface OpcionRangoTiempo {
  readonly valor: RangoTiempoRotacion;
  readonly etiqueta: string;
}

export const RANGOS_TIEMPO_ROTACION: readonly OpcionRangoTiempo[] = [
  { valor: 'TODOS', etiqueta: 'Todos' },
  { valor: '0_7', etiqueta: '0–7 días' },
  { valor: '8_15', etiqueta: '8–15 días' },
  { valor: '16_30', etiqueta: '16–30 días' },
  { valor: '31_60', etiqueta: '31–60 días' },
  { valor: 'MAS_60', etiqueta: '+60 días' },
  { valor: 'SIN_DATOS', etiqueta: 'Sin datos' }
];

export function getRangoTiempo(dias: number | null | undefined): Exclude<RangoTiempoRotacion, 'TODOS'> {
  if (dias === null || dias === undefined) return 'SIN_DATOS';
  if (dias <= 7) return '0_7';
  if (dias <= 15) return '8_15';
  if (dias <= 30) return '16_30';
  if (dias <= 60) return '31_60';
  return 'MAS_60';
}

export function getEtiquetaRangoTiempo(rango: RangoTiempoRotacion): string {
  return RANGOS_TIEMPO_ROTACION.find((opcion) => opcion.valor === rango)?.etiqueta ?? rango;
}
