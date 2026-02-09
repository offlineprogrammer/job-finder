/**
 * Search Jobs Handler
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createResponse } from '@job-finder/types';
import { Logger } from '@job-finder/utils';
import { SearchJobsResponse } from '@job-finder/types';

export async function searchJobs(
  event: APIGatewayProxyEvent,
  logger: Logger
): Promise<APIGatewayProxyResult> {
  // TODO: Implement search logic
  logger.info('Search jobs request', { queryParams: event.queryStringParameters });

  // Placeholder response
  const response: SearchJobsResponse = {
    jobs: [],
    total: 0,
  };

  return createResponse(200, response);
}
