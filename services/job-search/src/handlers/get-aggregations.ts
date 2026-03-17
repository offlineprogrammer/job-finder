/**
 * Get Aggregations Handler
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createResponse, createErrorResponse } from '@job-finder/types';
import { Logger, ValidationError } from '@job-finder/utils';
import { AggregationsResponse, SearchJobsRequest } from '@job-finder/types';
import { getAggregationsFromOpenSearch } from '../services/opensearch-service';
import { validateSearchRequest } from '../utils/validation';

export async function getAggregations(
  event: APIGatewayProxyEvent,
  logger: Logger
): Promise<APIGatewayProxyResult> {
  try {
    logger.info('Get aggregations request', { queryParams: event.queryStringParameters });

    // Parse request parameters (same as search, but without limit/cursor)
    const requestParams: Partial<SearchJobsRequest> = {
      q: event.queryStringParameters?.q,
      location: event.queryStringParameters?.location,
      remote: event.queryStringParameters?.remote === 'true' || event.queryStringParameters?.remote === '1',
      min_salary: event.queryStringParameters?.min_salary ? Number(event.queryStringParameters.min_salary) : undefined,
      max_salary: event.queryStringParameters?.max_salary ? Number(event.queryStringParameters.max_salary) : undefined,
      provider: event.queryStringParameters?.provider,
      posted_after: event.queryStringParameters?.posted_after,
    };

    // Validate request (without limit/cursor)
    const validatedRequest = validateSearchRequest(requestParams);

    // Get aggregations from OpenSearch
    const aggregations = await getAggregationsFromOpenSearch(validatedRequest, logger);

    const response: AggregationsResponse = {
      locations: aggregations.locations,
      salary_ranges: aggregations.salary_ranges,
    };

    logger.info('Aggregations retrieved successfully', {
      locationCount: aggregations.locations.length,
      salaryRangeCount: aggregations.salary_ranges.length,
    });

    return createResponse(200, response);
  } catch (error) {
    if (error instanceof ValidationError) {
      logger.warn('Validation error', { error: error.message });
      return createErrorResponse(400, error.message);
    }

    logger.error('Get aggregations error', error as Error);
    return createErrorResponse(500, 'Internal server error');
  }
}
