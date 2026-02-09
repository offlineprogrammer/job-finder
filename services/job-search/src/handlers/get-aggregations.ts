/**
 * Get Aggregations Handler
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createResponse } from '@job-finder/types';
import { Logger } from '@job-finder/utils';
import { AggregationsResponse } from '@job-finder/types';

export async function getAggregations(
  event: APIGatewayProxyEvent,
  logger: Logger
): Promise<APIGatewayProxyResult> {
  // TODO: Implement aggregations logic
  logger.info('Get aggregations request', { queryParams: event.queryStringParameters });

  // Placeholder response
  const response: AggregationsResponse = {
    locations: [],
    salary_ranges: [],
  };

  return createResponse(200, response);
}
