/**
 * Search Jobs Handler
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createResponse } from '@job-finder/types';
import { Logger } from '@job-finder/utils';
import { SearchJobsRequest, SearchJobsResponse } from '@job-finder/types';

export async function searchJobs(
  event: APIGatewayProxyEvent,
  logger: Logger
): Promise<APIGatewayProxyResult> {
  // TODO: Implement search logic
  logger.info('Search jobs request', { queryParams: event.queryStringParameters });

  const request: SearchJobsRequest = {
    q: event.queryStringParameters?.q,
    location: event.queryStringParameters?.location,
    remote: event.queryStringParameters?.remote === 'true',
    min_salary: event.queryStringParameters?.min_salary ? Number(event.queryStringParameters.min_salary) : undefined,
    max_salary: event.queryStringParameters?.max_salary ? Number(event.queryStringParameters.max_salary) : undefined,
    limit: event.queryStringParameters?.limit ? Number(event.queryStringParameters.limit) : 20,
    cursor: event.queryStringParameters?.cursor,
  };

  // Placeholder response
  const response: SearchJobsResponse = {
    jobs: [],
    total: 0,
  };

  return createResponse(200, response);
}
