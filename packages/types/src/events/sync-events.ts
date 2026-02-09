/**
 * Sync-related EventBridge events
 */

export interface SearchSavedEvent {
  source: 'job-finder.search-management';
  'detail-type': 'Search Saved';
  detail: {
    user_id: string;
    search_id: string;
    created_at: string;
  };
}

export interface SearchUpdatedEvent {
  source: 'job-finder.search-management';
  'detail-type': 'Search Updated';
  detail: {
    user_id: string;
    search_id: string;
    updated_at: string;
  };
}

export interface SearchDeletedEvent {
  source: 'job-finder.search-management';
  'detail-type': 'Search Deleted';
  detail: {
    user_id: string;
    search_id: string;
    deleted_at: string;
  };
}

export interface SearchAlertEnabledEvent {
  source: 'job-finder.search-management';
  'detail-type': 'Search Alert Enabled';
  detail: {
    user_id: string;
    search_id: string;
    enabled_at: string;
  };
}
