import { ApiResponse } from './api-response.interface';
import { KpisProveedoresInteligencia } from './kpis-proveedores-inteligencia.interface';
import { PaginationMetadata } from './paginacion-metadata.interface';
import { ProveedorInteligencia } from './proveedor-inteligencia.interface';

export interface ProveedoresInteligenciaMetadata extends PaginationMetadata {
  kpIs: KpisProveedoresInteligencia;
}

export interface ProveedoresInteligenciaResponse extends ApiResponse<ProveedorInteligencia[]> {
  metadata: ProveedoresInteligenciaMetadata;
}
