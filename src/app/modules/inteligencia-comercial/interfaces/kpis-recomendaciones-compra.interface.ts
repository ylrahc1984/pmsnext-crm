export interface KpisRecomendacionesCompra {
  TotalUrgentes: number;
  TotalAltas: number;
  TotalMedias: number;
  TotalBajas: number;

  InversionTotalEstimada: number;
  UnidadesTotalesRecomendadas: number;
  InversionCritica: number;

  ProductosAgotanProximos7Dias: number;
  ProductosAgotadosAhora: number;
}
