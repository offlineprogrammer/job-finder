/**
 * Search Management API types
 */

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

export interface SavedSearch {
  search_id: string;
  user_id: string;
  name: string;
  query_params: Record<string, unknown>;
  alert_enabled: boolean;
  created_at: string; // ISO8601
  updated_at: string; // ISO8601
  last_alert_at?: string; // ISO8601
}
