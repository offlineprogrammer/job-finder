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
    if (path === '/api/v1/jobs' && httpMethod === 'GET') {
      return await searchJobs(event, requestLogger);
    }

    if (path.startsWith('/api/v1/jobs/') && httpMethod === 'GET') {
      const jobId = path.split('/').pop();
      if (jobId && !jobId.includes('aggregations')) {
        return await getJob(event, jobId, requestLogger);
      }
    }

    if (path === '/api/v1/jobs/aggregations' && httpMethod === 'GET') {
      return await getAggregations(event, requestLogger);
    }

    return createErrorResponse(404, 'Not Found');
  } catch (error) {
    requestLogger.error('Handler error', error as Error);
    return createErrorResponse(500, 'Internal Server Error', error);
  }
};
