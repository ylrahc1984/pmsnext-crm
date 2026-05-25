import { ApiResponse } from './api-response.interface';
import { AlertaInventario } from './alerta-inventario.interface';
import { KpisAlertasInventario } from './kpis-alertas.interface';
import { PaginationMetadata } from './paginacion-metadata.interface';

export interface AlertasMetadata extends PaginationMetadata {
  kpIs: KpisAlertasInventario;
}

export interface AlertasInventarioResponse extends ApiResponse<AlertaInventario[]> {
  metadata: AlertasMetadata;
}
