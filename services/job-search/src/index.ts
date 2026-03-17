/**
 * Job Search Service Lambda Handler
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { createErrorResponse } from '@job-finder/types';
import { logger } from '@job-finder/utils';
import { searchJobs } from './handlers/search-jobs';
import { getJob } from './handlers/get-job';
import { getAggregations } from './handlers/get-aggregations';

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  const requestLogger = logger.withContext({
    requestId: context.awsRequestId,
    path: event.path,
    method: event.httpMethod,
  });

  try {
    const { path, httpMethod } = event;

    // Route requests based on path and method
    // GET /api/v1/jobs - Search jobs
    if (path === '/api/v1/jobs' && httpMethod === 'GET') {
      return await searchJobs(event, requestLogger);
    }

    // GET /api/v1/jobs/aggregations - Get aggregations
    if (path === '/api/v1/jobs/aggregations' && httpMethod === 'GET') {
      return await getAggregations(event, requestLogger);
    }

    // GET /api/v1/jobs/{job_id} - Get single job
    if (path.startsWith('/api/v1/jobs/') && httpMethod === 'GET') {
      const pathParts = path.split('/').filter(Boolean);
      const jobId = pathParts[pathParts.length - 1];

      if (jobId && jobId !== 'aggregations' && jobId !== 'jobs') {
        return await getJob(event, jobId, requestLogger);
      }
    }

    return createErrorResponse(404, 'Not Found');
  } catch (error) {
    requestLogger.error('Handler error', error as Error);
    return createErrorResponse(500, 'Internal Server Error');
  }
};
