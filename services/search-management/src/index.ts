import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { createErrorResponse } from '@job-finder/types';

export const handler = async (
  _event: APIGatewayProxyEvent,
  _context: Context
): Promise<APIGatewayProxyResult> => {
  // TODO: Implement search management handlers
  return createErrorResponse(501, 'Not Implemented');
};
