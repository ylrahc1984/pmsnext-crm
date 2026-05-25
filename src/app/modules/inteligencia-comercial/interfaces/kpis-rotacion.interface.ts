export interface KpisRotacionInventario {
  TotalAgotados: number;
  TotalCriticos: number;
  TotalRotacionRapida: number;
  TotalRotacionNormal: number;
  TotalRotacionLenta: number;
  TotalSobreStock: number;
  TotalSinConsumo: number;
  TotalSaludables: number;
  TotalRiesgo: number;
  TotalEnRiesgo: number;
  TotalCriticosSalud: number;
  PromedioDiasInventario: number;
  PromedioMargenFinanciero: number;
  PromedioConsumoDiario: number;
}
