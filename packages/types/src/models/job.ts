/**
 * Job domain model
 */

export interface Job {
  job_id: string; // Composite: provider_id#job_id
  provider_id: string;
  title: string;
  description: string;
  company: string;
  location: string;
  remote: boolean;
  min_salary?: number;
  max_salary?: number;
  posted_date: string; // ISO8601
  expires_at?: string; // ISO8601
  apply_url: string;
  tags?: string[];
}

export interface JobDocument extends Job {
  // OpenSearch document fields
  _id?: string;
  _score?: number;
}
