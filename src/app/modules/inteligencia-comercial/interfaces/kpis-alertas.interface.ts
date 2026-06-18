export interface KpisAlertasInventario {
  TotalAlertasCriticas: number;
  TotalAlertasAltas: number;
  TotalAlertasMedias: number;
  TotalAlertasBajas: number;
  TiposDiferentesAlerta: number;
  TiposAlertaBase: number;
  TiposAlertaAnalitica: number;
  CapitalTotalEnRiesgo: number;
  ScorePromedio: number;
  TotalAlertasInventario: number;
  TotalAlertasComerciales: number;
  TotalAlertasFinancieras: number;
  AlertasInventarioMinimo: number;
  AlertasInventarioMaximo: number;
  AlertasBajaRotacion: number;
  AlertasExcesoPermanencia: number;
  ProductosAgotados: number;
  RiesgoRuptura: number;
  SobreStockAnalitico: number;
  MargenesNegativos: number;
  AltoCapitalInmovilizado: number;
  DiasAnalisis: number;
  FechaDesdeAnalisis: string;
  FechaHastaAnalisis: string;
}
