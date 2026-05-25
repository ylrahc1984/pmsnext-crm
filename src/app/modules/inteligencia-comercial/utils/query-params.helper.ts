import { HttpParams } from '@angular/common/http';

export type QueryParamValue = string | number | boolean | Date | null | undefined;
export type QueryParamValueList = readonly Exclude<QueryParamValue, null | undefined>[];

export function buildQueryParams<TFilters extends object>(filters?: TFilters): HttpParams {
  let params = new HttpParams();

  if (!filters) {
    return params;
  }

  Object.entries(filters).forEach(([key, value]: [string, unknown]) => {
    if (isQueryParamValueList(value)) {
      value.forEach((item) => {
        if (isQueryParamValue(item)) {
          params = params.append(key, serializeQueryParamValue(item));
        }
      });
      return;
    }

    if (isQueryParamValue(value)) {
      params = params.set(key, serializeQueryParamValue(value));
    }
  });

  return params;
}

function isQueryParamValue(value: unknown): value is Exclude<QueryParamValue, null | undefined> {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === 'string') {
    return value.trim().length > 0;
  }

  return typeof value === 'number' || typeof value === 'boolean' || value instanceof Date;
}

function isQueryParamValueList(value: unknown): value is QueryParamValueList {
  return Array.isArray(value) && value.some((item) => isQueryParamValue(item));
}

function serializeQueryParamValue(value: Exclude<QueryParamValue, null | undefined>): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'string') {
    return value.trim();
  }

  return String(value);
}
