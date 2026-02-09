/**
 * Get Job Handler
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createResponse, createErrorResponse } from '@job-finder/types';
import { Logger, NotFoundError } from '@job-finder/utils';
import { GetJobResponse } from '@job-finder/types';

export async function getJob(
  event: APIGatewayProxyEvent,
  jobId: string,
  logger: Logger
): Promise<APIGatewayProxyResult> {
  // TODO: Implement get job logic
  logger.info('Get job request', { jobId });

  // Placeholder response
  throw new NotFoundError('Job', jobId);
}
