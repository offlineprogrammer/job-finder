/**
 * Search Management API types
 */

import type { SavedSearch } from '../models';

export interface ListSearchesRequest {
  limit?: number;
  cursor?: string;
}

export interface ListSearchesResponse {
  searches: SavedSearch[];
  next_cursor?: string;
}

export interface CreateSearchRequest {
  name: string;
  query_params: Record<string, unknown>;
  alert_enabled?: boolean;
}

export interface CreateSearchResponse {
  search: SavedSearch;
}

export interface GetSearchResponse {
  search: SavedSearch;
}

export interface UpdateSearchRequest {
  name?: string;
  query_params?: Record<string, unknown>;
  alert_enabled?: boolean;
}
