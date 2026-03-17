/**
 * JobSearchStack
 *
 * Provisions all AWS resources owned by the Job Search Service:
 *
 *  Compute
 *  ───────
 *  • Lambda function — job-search
 *    Handles GET /api/v1/jobs, GET /api/v1/jobs/{job_id},
 *    and GET /api/v1/jobs/aggregations
 *
 *  IAM
 *  ───
 *  • Read-only access to the jobs DynamoDB table
 *  • Read access to the OpenSearch domain
 *  • X-Ray write access (via managed policy)
 *  • CloudWatch Logs / Insights (via managed policy)
 *
 *  API Gateway routes (added to the shared RestApi)
 *  ─────────────────────────────────────────────────
 *  GET  /api/v1/jobs                — public (API key)
 *  GET  /api/v1/jobs/aggregations   — public (API key)
 *  GET  /api/v1/jobs/{job_id}       — public (API key)
 */

import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as opensearch from 'aws-cdk-lib/aws-opensearchservice';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as path from 'path';
import { Construct } from 'constructs';
import { JobFinderFunction } from '../constructs/lambda-function';
import { applyStandardTags } from '../utils/tags';

export interface JobSearchStackProps extends cdk.StackProps {
  deployEnv: string;
  api: apigw.RestApi;
  authorizer: apigw.CfnAuthorizer;
  requestValidator: apigw.RequestValidator;
  jobsTable: dynamodb.Table;
  openSearchDomain: opensearch.Domain;
  userPool: cognito.UserPool;
}

export class JobSearchStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: JobSearchStackProps) {
    super(scope, id, props);

    const {
      deployEnv,
      api,
      requestValidator,
      jobsTable,
      openSearchDomain,
    } = props;

    applyStandardTags(this, deployEnv);

    // ---------------------------------------------------------------
    // Lambda Function
    // ---------------------------------------------------------------
    const fn = new JobFinderFunction(this, 'JobSearchFn', {
      functionName: 'job-search',
      // Path to the compiled service dist — resolved at synth time
      codePath: path.join(__dirname, '../../../../services/job-search/dist'),
      handler: 'index.handler',
      memorySize: 1024,
      timeout: cdk.Duration.seconds(15),
      reservedConcurrentExecutions: 50,
      deployEnv,
      environment: {
        JOBS_TABLE_NAME:    jobsTable.tableName,
        OPENSEARCH_DOMAIN:  openSearchDomain.domainEndpoint,
        ENVIRONMENT:        deployEnv,
      },
      // Custom IAM policies added below
      extraPolicies: [
        // DynamoDB — read-only access to the jobs table
        new iam.PolicyStatement({
          sid: 'DynamoDBJobsRead',
          effect: iam.Effect.ALLOW,
          actions: [
            'dynamodb:GetItem',
            'dynamodb:BatchGetItem',
            'dynamodb:Query',
          ],
          resources: [
            jobsTable.tableArn,
            `${jobsTable.tableArn}/index/*`,
          ],
        }),

        // OpenSearch — read access
        new iam.PolicyStatement({
          sid: 'OpenSearchRead',
          effect: iam.Effect.ALLOW,
          actions: [
            'es:ESHttpGet',
            'es:ESHttpPost',  // required for _search
          ],
          resources: [
            `${openSearchDomain.domainArn}/*`,
          ],
        }),
      ],
    });

    // ---------------------------------------------------------------
    // API Gateway Routes
    //
    // Path structure: /api/v1/jobs, /api/v1/jobs/aggregations,
    //                 /api/v1/jobs/{job_id}
    // ---------------------------------------------------------------
    const apiResource = api.root
      .getResource('api')   ?? api.root.addResource('api');
    const v1 = apiResource
      .getResource('v1')    ?? apiResource.addResource('v1');
    const jobsResource = v1
      .getResource('jobs')  ?? v1.addResource('jobs');

    const integration = new apigw.LambdaIntegration(fn.function, { proxy: true });

    // GET /api/v1/jobs  — search
    jobsResource.addMethod(
      'GET',
      integration,
      {
        authorizationType: apigw.AuthorizationType.NONE,
        requestValidator,
        methodResponses: [
          { statusCode: '200' },
          { statusCode: '400' },
          { statusCode: '429' },
          { statusCode: '500' },
        ],
      }
    );

    // GET /api/v1/jobs/aggregations
    const aggregationsResource = jobsResource.addResource('aggregations');
    aggregationsResource.addMethod(
      'GET',
      integration,
      {
        authorizationType: apigw.AuthorizationType.NONE,
        requestValidator,
        methodResponses: [
          { statusCode: '200' },
          { statusCode: '400' },
          { statusCode: '500' },
        ],
      }
    );

    // GET /api/v1/jobs/{job_id}
    const jobIdResource = jobsResource.addResource('{job_id}');
    jobIdResource.addMethod(
      'GET',
      integration,
      {
        authorizationType: apigw.AuthorizationType.NONE,
        requestValidator,
        requestParameters: {
          'method.request.path.job_id': true,
        },
        methodResponses: [
          { statusCode: '200' },
          { statusCode: '404' },
          { statusCode: '500' },
        ],
      }
    );

    // ---------------------------------------------------------------
    // Stack outputs
    // ---------------------------------------------------------------
    new cdk.CfnOutput(this, 'JobSearchFunctionArn', {
      value: fn.function.functionArn,
      exportName: `JobFinder-${deployEnv}-JobSearchFunctionArn`,
    });

    new cdk.CfnOutput(this, 'JobSearchDlqUrl', {
      value: fn.dlq?.queueUrl ?? 'N/A',
      exportName: `JobFinder-${deployEnv}-JobSearchDlqUrl`,
    });
  }
}
