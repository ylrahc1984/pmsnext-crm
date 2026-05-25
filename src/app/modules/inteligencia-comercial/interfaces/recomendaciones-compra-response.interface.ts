import { ApiResponse } from './api-response.interface';
import { KpisRecomendacionesCompra } from './kpis-recomendaciones-compra.interface';
import { PaginationMetadata } from './paginacion-metadata.interface';
import { RecomendacionCompra } from './recomendacion-compra.interface';

export interface RecomendacionesCompraMetadata extends PaginationMetadata {
  kpIs: KpisRecomendacionesCompra;
}

export interface RecomendacionesCompraResponse extends ApiResponse<RecomendacionCompra[]> {
  metadata: RecomendacionesCompraMetadata;
}
