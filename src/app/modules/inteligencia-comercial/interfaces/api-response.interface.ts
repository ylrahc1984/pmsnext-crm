import { PaginationMetadata } from './paginacion-metadata.interface';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  metadata: PaginationMetadata;
}
