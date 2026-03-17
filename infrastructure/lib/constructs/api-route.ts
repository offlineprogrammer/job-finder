/**
 * Reusable API Gateway Route Construct
 * Adds a Lambda-integrated resource + method to an existing RestApi,
 * wires in the Cognito authorizer, and enables request validation.
 */

import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

export interface ApiRouteProps {
  /** The RestApi to attach to */
  api: apigw.RestApi;
  /** Path segments, e.g. ['jobs'] or ['jobs', '{job_id}'] */
  pathParts: string[];
  /** HTTP method, e.g. 'GET' */
  method: string;
  /** The Lambda function to integrate */
  lambdaFunction: lambda.Function;
  /** The Cognito authorizer (pass undefined for public endpoints) */
  authorizer?: apigw.CfnAuthorizer;
  /** Request validator for query-string / body validation */
  requestValidator?: apigw.RequestValidator;
  /** Per-method throttling settings */
  throttle?: apigw.ThrottleSettings;
}

export class ApiRoute extends Construct {
  public readonly resource: apigw.IResource;
  public readonly method: apigw.Method;

  constructor(scope: Construct, id: string, props: ApiRouteProps) {
    super(scope, id);

    const { api, pathParts, method, lambdaFunction, authorizer, requestValidator, throttle } = props;

    // Walk / create nested resources
    let resource: apigw.IResource = api.root;
    for (const part of pathParts) {
      resource = resource.getResource(part) ?? resource.addResource(part);
    }
    this.resource = resource;

    // Lambda integration
    const integration = new apigw.LambdaIntegration(lambdaFunction, {
      proxy: true,
    });

    // Method options — built in one shot because MethodOptions fields are readonly
    const methodOptions: apigw.MethodOptions = {
      requestValidator,
      methodResponses: [
        { statusCode: '200' },
        { statusCode: '400' },
        { statusCode: '404' },
        { statusCode: '429' },
        { statusCode: '500' },
      ],
      ...(throttle && { throttlingBurstLimit: throttle.burstLimit, throttlingRateLimit: throttle.rateLimit }),
      authorizationType: authorizer ? apigw.AuthorizationType.COGNITO : apigw.AuthorizationType.NONE,
      ...(authorizer && { authorizer: { authorizerId: authorizer.ref } }),
    };

    this.method = (resource as apigw.Resource).addMethod(method, integration, methodOptions);
  }
}
