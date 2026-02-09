/**
 * Get Job Handler
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Logger, NotFoundError } from '@job-finder/utils';

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
