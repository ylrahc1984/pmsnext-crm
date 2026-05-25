import { ApiResponse } from './api-response.interface';
import { FlujoCajaInventario } from './flujo-caja-inventario.interface';
import { KpisFlujoCajaInventario } from './kpis-flujo-caja.interface';
import { PaginationMetadata } from './paginacion-metadata.interface';

export interface FlujoCajaMetadata extends PaginationMetadata {
  kpIs: KpisFlujoCajaInventario;
}

export interface FlujoCajaInventarioResponse extends ApiResponse<FlujoCajaInventario[]> {
  metadata: FlujoCajaMetadata;
}
