import { ApiResponse } from './api-response.interface';
import { KpisRotacionInventario } from './kpis-rotacion.interface';
import { PaginationMetadata } from './paginacion-metadata.interface';
import { RotacionInventario } from './rotacion-inventario.interface';

export interface RotacionMetadata extends PaginationMetadata {
  kpIs: KpisRotacionInventario;
}

export interface RotacionInventarioResponse extends ApiResponse<RotacionInventario[]> {
  metadata: RotacionMetadata;
}
