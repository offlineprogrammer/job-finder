import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { createErrorResponse } from '@job-finder/types';
import { logger } from '@job-finder/utils';

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  // TODO: Implement user service handlers
  return createErrorResponse(501, 'Not Implemented');
};
