/**
 * Job Search API types
 */

import type { Job } from '../models';

export interface SearchJobsRequest {
  q?: string;
  location?: string;
  remote?: boolean;
  min_salary?: number;
  max_salary?: number;
  provider?: string;
  posted_after?: string; // ISO8601
  limit?: number;
  cursor?: string;
}

export interface SearchJobsResponse {
  jobs: Job[];
  total: number;
  next_cursor?: string;
}

export interface GetJobRequest {
  job_id: string;
}

export interface GetJobResponse {
  job: Job;
}

export interface AggregationsRequest {
  q?: string;
  location?: string;
  remote?: boolean;
  min_salary?: number;
  max_salary?: number;
}

export interface AggregationsResponse {
  locations: Array<{ location: string; count: number }>;
  salary_ranges: Array<{ range: string; count: number }>;
}
