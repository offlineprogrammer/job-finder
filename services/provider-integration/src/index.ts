import { Context } from 'aws-lambda';
import { logger } from '@job-finder/utils';

export interface FetchJobsRequest {
  provider: string;
  params: Record<string, unknown>;
  pagination?: {
    page: number;
    per_page: number;
  };
}

export const handler = async (event: FetchJobsRequest, context: Context): Promise<unknown> => {
  // TODO: Implement provider adapter handler
  logger.info('Fetch jobs request', { provider: event.provider });
  return { jobs: [] };
};
