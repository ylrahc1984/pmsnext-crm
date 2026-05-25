export interface KpisProveedoresInteligencia {
  TotalRojo: number;
  TotalAmarillo: number;
  TotalVerde: number;

  TotalActivos: number;
  TotalLentos: number;
  TotalInactivos: number;
  TotalCriticosDependencia: number;

  TotalCompraContado: number;

  CompraTotalAnalizada: number;

  PromedioDiasCredito: number;
  PromedioLeadTime: number;
  PromedioParticipacionProveedor: number;

  MayorDependenciaProveedor: number;

  ProveedoresAltaDependencia: number;
  ProveedoresLeadTimeAlto: number;
}
