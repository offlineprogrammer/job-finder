/**
 * ApiStack
 *
 * Provisions the API Gateway REST API that is shared across all Lambda
 * services, the Cognito authorizer, and WAF association.
 *
 * Each service stack adds its own routes by importing this stack's
 * exported `api` and `authorizer` properties.
 */

import * as cdk from 'aws-cdk-lib';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import { applyStandardTags } from '../utils/tags';

export interface ApiStackProps extends cdk.StackProps {
  deployEnv: string;
  userPool: cognito.UserPool;
  webAclArn: string;
}

export class ApiStack extends cdk.Stack {
  public readonly api: apigw.RestApi;
  public readonly authorizer: apigw.CfnAuthorizer;
  public readonly requestValidator: apigw.RequestValidator;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const { deployEnv, userPool, webAclArn } = props;
    applyStandardTags(this, deployEnv);

    // ---------------------------------------------------------------
    // Access log group for API Gateway
    // ---------------------------------------------------------------
    const accessLogGroup = new logs.LogGroup(this, 'ApiAccessLogs', {
      logGroupName: `/job-finder/${deployEnv}/api-gateway/access-logs`,
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy:
        deployEnv === 'production' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // ---------------------------------------------------------------
    // REST API
    // ---------------------------------------------------------------
    this.api = new apigw.RestApi(this, 'Api', {
      restApiName: `job-finder-${deployEnv}-api`,
      description: 'Job Finder Platform REST API',
      deployOptions: {
        stageName: deployEnv,
        // Throttling defaults (can be overridden per-route)
        throttlingBurstLimit: 500,
        throttlingRateLimit: 1000,
        // Enable detailed metrics per resource/method
        metricsEnabled: true,
        dataTraceEnabled: deployEnv !== 'production', // disable data trace in prod
        tracingEnabled: true, // X-Ray
        loggingLevel:
          deployEnv === 'production'
            ? apigw.MethodLoggingLevel.ERROR
            : apigw.MethodLoggingLevel.INFO,
        accessLogDestination: new apigw.LogGroupLogDestination(accessLogGroup),
        accessLogFormat: apigw.AccessLogFormat.jsonWithStandardFields({
          caller: true,
          httpMethod: true,
          ip: true,
          protocol: true,
          requestTime: true,
          resourcePath: true,
          responseLength: true,
          status: true,
          user: true,
        }),
      },
      // Minimal default CORS – services add finer-grained settings
      defaultCorsPreflightOptions: {
        allowOrigins:
          deployEnv === 'production'
            ? ['https://app.jobfinder.example.com']
            : apigw.Cors.ALL_ORIGINS,
        allowMethods: apigw.Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
          'X-Amz-Security-Token',
        ],
        maxAge: cdk.Duration.minutes(10),
      },
      // Model validation
      failOnWarnings: true,
    });

    // ---------------------------------------------------------------
    // Cognito Authorizer — used by all authenticated endpoints
    // ---------------------------------------------------------------
    this.authorizer = new apigw.CfnAuthorizer(this, 'CognitoAuthorizer', {
      name: `job-finder-${deployEnv}-cognito-authorizer`,
      restApiId: this.api.restApiId,
      type: 'COGNITO_USER_POOLS',
      identitySource: 'method.request.header.Authorization',
      providerArns: [userPool.userPoolArn],
    });

    // ---------------------------------------------------------------
    // Request Validator — validate query strings & headers
    // ---------------------------------------------------------------
    this.requestValidator = new apigw.RequestValidator(this, 'RequestValidator', {
      restApi: this.api,
      requestValidatorName: `job-finder-${deployEnv}-validator`,
      validateRequestBody: false,
      validateRequestParameters: true,
    });

    // ---------------------------------------------------------------
    // WAF association
    // ---------------------------------------------------------------
    new wafv2.CfnWebACLAssociation(this, 'WafAssociation', {
      resourceArn: `arn:aws:apigateway:${this.region}::/restapis/${this.api.restApiId}/stages/${deployEnv}`,
      webAclArn,
    });

    // ---------------------------------------------------------------
    // SSM Parameters
    // ---------------------------------------------------------------
    const ssmPrefix = `/job-finder/${deployEnv}`;

    new ssm.StringParameter(this, 'ApiIdParam', {
      parameterName: `${ssmPrefix}/api-gateway/api-id`,
      stringValue: this.api.restApiId,
    });

    new ssm.StringParameter(this, 'ApiUrlParam', {
      parameterName: `${ssmPrefix}/api-gateway/url`,
      stringValue: this.api.url,
    });

    // ---------------------------------------------------------------
    // Stack outputs
    // ---------------------------------------------------------------
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: this.api.url,
      exportName: `JobFinder-${deployEnv}-ApiUrl`,
    });

    new cdk.CfnOutput(this, 'ApiId', {
      value: this.api.restApiId,
      exportName: `JobFinder-${deployEnv}-ApiId`,
    });
  }
}
