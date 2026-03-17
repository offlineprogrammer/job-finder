/**
 * Get Job Handler
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createResponse, createErrorResponse } from '@job-finder/types';
import { Logger, NotFoundError, ValidationError } from '@job-finder/utils';
import { GetJobResponse } from '@job-finder/types';
import { getJobFromDynamoDB } from '../services/dynamodb-service';

export async function getJob(
  event: APIGatewayProxyEvent,
  jobId: string,
  logger: Logger
): Promise<APIGatewayProxyResult> {
  try {
    logger.info('Get job request', { jobId });

    // Validate job ID format
    if (!jobId || jobId.trim().length === 0) {
      throw new ValidationError('Job ID is required');
    }

    // Get job from DynamoDB
    const job = await getJobFromDynamoDB(jobId, logger);

    const response: GetJobResponse = {
      job,
    };

    logger.info('Job retrieved successfully', { jobId });
    return createResponse(200, response);
  } catch (error) {
    if (error instanceof NotFoundError) {
      logger.warn('Job not found', { jobId, error: error.message });
      return createErrorResponse(404, error.message);
    }

    if (error instanceof ValidationError) {
      logger.warn('Validation error', { error: error.message });
      return createErrorResponse(400, error.message);
    }

    logger.error('Get job error', error as Error, { jobId });
    return createErrorResponse(500, 'Internal server error');
  }
}
