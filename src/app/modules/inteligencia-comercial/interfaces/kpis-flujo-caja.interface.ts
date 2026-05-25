export interface KpisFlujoCajaInventario {
  TotalRojo: number;
  TotalAmarillo: number;
  TotalVerde: number;
  TotalGris: number;

  CapitalTotalEnRiesgo: number;
  ValorInventarioTotal: number;

  TotalCriticos: number;
  TotalRiesgo: number;
  TotalSaludables: number;
  TotalSinDatosCredito: number;

  PromedioDiasInventario: number;
  PromedioDiasCredito: number;
  PromedioMargenDiasCaja: number;
}
