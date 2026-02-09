/**
 * AWS Lambda types
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';

export interface LambdaHandler<TEvent = APIGatewayProxyEvent, TResult = APIGatewayProxyResult> {
  (event: TEvent, context: Context): Promise<TResult>;
}

export interface CognitoAuthorizerContext {
  sub: string;
  email: string;
  'cognito:username': string;
  [key: string]: string;
}

export interface APIGatewayEventWithAuth extends APIGatewayProxyEvent {
  requestContext: {
    authorizer: {
      claims: CognitoAuthorizerContext;
    };
  } & APIGatewayProxyEvent['requestContext'];
}
