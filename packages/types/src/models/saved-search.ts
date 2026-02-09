/**
 * Saved Search domain model
 */

export interface SavedSearch {
  user_id: string; // Partition key
  search_id: string; // Sort key (UUID)
  name: string;
  query_params: Record<string, unknown>;
  alert_enabled: boolean;
  created_at: string; // ISO8601
  updated_at: string; // ISO8601
  last_alert_at?: string; // ISO8601
}
