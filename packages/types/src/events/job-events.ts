/**
 * Job-related EventBridge events
 */

export interface JobViewedEvent {
  source: 'job-finder.job-search';
  'detail-type': 'Job Viewed';
  detail: {
    job_id: string;
    user_id?: string;
    timestamp: string;
  };
}

export interface JobSearchPerformedEvent {
  source: 'job-finder.job-search';
  'detail-type': 'Job Search Performed';
  detail: {
    query_params: Record<string, unknown>;
    result_count: number;
    timestamp: string;
  };
}

export interface JobSyncStartedEvent {
  source: 'job-finder.job-sync';
  'detail-type': 'Job Sync Started';
  detail: {
    provider: string;
    sync_type: 'full' | 'incremental';
    started_at: string;
  };
}

export interface JobSyncCompletedEvent {
  source: 'job-finder.job-sync';
  'detail-type': 'Job Sync Completed';
  detail: {
    provider: string;
    jobs_synced: number;
    started_at: string;
    completed_at: string;
    status: 'success' | 'partial' | 'failed';
  };
}

export interface JobSyncFailedEvent {
  source: 'job-finder.job-sync';
  'detail-type': 'Job Sync Failed';
  detail: {
    provider: string;
    error: string;
    started_at: string;
    failed_at: string;
  };
}
