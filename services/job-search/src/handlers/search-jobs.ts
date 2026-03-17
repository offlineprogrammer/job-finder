/**
 * Search Jobs Handler
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createResponse, createErrorResponse } from '@job-finder/types';
import { Logger, ValidationError } from '@job-finder/utils';
import { SearchJobsRequest } from '@job-finder/types';
import { searchJobsInOpenSearch } from '../services/opensearch-service';
import { validateSearchRequest } from '../utils/validation';

export async function searchJobs(
  event: APIGatewayProxyEvent,
  logger: Logger
): Promise<APIGatewayProxyResult> {
  try {
    logger.info('Search jobs request', { queryParams: event.queryStringParameters });

    // Parse and validate request parameters
    const requestParams: Partial<SearchJobsRequest> = {
      q: event.queryStringParameters?.q,
      location: event.queryStringParameters?.location,
      remote: event.queryStringParameters?.remote === 'true' || event.queryStringParameters?.remote === '1',
      min_salary: event.queryStringParameters?.min_salary ? Number(event.queryStringParameters.min_salary) : undefined,
      max_salary: event.queryStringParameters?.max_salary ? Number(event.queryStringParameters.max_salary) : undefined,
      provider: event.queryStringParameters?.provider,
      posted_after: event.queryStringParameters?.posted_after,
      limit: event.queryStringParameters?.limit ? Number(event.queryStringParameters.limit) : undefined,
      cursor: event.queryStringParameters?.cursor,
    };

    // Validate request
    const validatedRequest = validateSearchRequest(requestParams);

    // Search OpenSearch
    const response = await searchJobsInOpenSearch(validatedRequest, logger);

    logger.info('Search completed', {
      resultCount: response.jobs.length,
      total: response.total,
      hasNext: !!response.next_cursor,
    });

    return createResponse(200, response);
  } catch (error) {
    if (error instanceof ValidationError) {
      logger.warn('Validation error', { error: error.message });
      return createErrorResponse(400, error.message);
    }

    logger.error('Search jobs error', error as Error);
    return createErrorResponse(500, 'Internal server error');
  }
}
