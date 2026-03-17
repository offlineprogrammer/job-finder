/**
 * Reusable Lambda Function Construct
 * Wraps aws-cdk-lib Lambda with project-standard defaults:
 * - Node.js 20 runtime
 * - X-Ray tracing enabled
 * - Structured logging via LOG_LEVEL env var
 * - Dead-letter queue wired up for async invocations
 */

import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';

export interface JobFinderFunctionProps {
  /** Human-readable name used for resource IDs and the Lambda function name */
  functionName: string;
  /** Path to the compiled Lambda handler directory (relative to cdk.json location) */
  codePath: string;
  /** Handler string, e.g. "index.handler" */
  handler?: string;
  /** Memory in MB – defaults to 512 */
  memorySize?: number;
  /** Timeout – defaults to 30 seconds */
  timeout?: cdk.Duration;
  /** Reserved concurrent executions – no default (unreserved) */
  reservedConcurrentExecutions?: number;
  /** Environment variables injected into the function */
  environment?: Record<string, string>;
  /** Extra IAM statements added to the function's execution role */
  extraPolicies?: iam.PolicyStatement[];
  /** Whether to create a DLQ for async invocations – defaults to true */
  createDlq?: boolean;
  /** Current deployment environment (dev | staging | production) */
  deployEnv: string;
}

export class JobFinderFunction extends Construct {
  public readonly function: lambda.Function;
  public readonly dlq?: sqs.Queue;
  public readonly logGroup: logs.LogGroup;

  constructor(scope: Construct, id: string, props: JobFinderFunctionProps) {
    super(scope, id);

    const {
      functionName,
      codePath,
      handler = 'index.handler',
      memorySize = 512,
      timeout = cdk.Duration.seconds(30),
      reservedConcurrentExecutions,
      environment = {},
      extraPolicies = [],
      createDlq = true,
      deployEnv,
    } = props;

    // CloudWatch Log Group with explicit retention
    this.logGroup = new logs.LogGroup(this, 'LogGroup', {
      logGroupName: `/aws/lambda/job-finder-${deployEnv}-${functionName}`,
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy:
        deployEnv === 'production' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // Optional DLQ for async invocations
    if (createDlq) {
      this.dlq = new sqs.Queue(this, 'Dlq', {
        queueName: `job-finder-${deployEnv}-${functionName}-dlq`,
        retentionPeriod: cdk.Duration.days(14),
        encryption: sqs.QueueEncryption.KMS_MANAGED,
      });
    }

    // Lambda function
    this.function = new lambda.Function(this, 'Function', {
      functionName: `job-finder-${deployEnv}-${functionName}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset(codePath),
      handler,
      memorySize,
      timeout,
      tracing: lambda.Tracing.ACTIVE, // X-Ray
      insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_229_0,
      logGroup: this.logGroup,
      reservedConcurrentExecutions,
      deadLetterQueue: this.dlq,
      environment: {
        NODE_ENV: deployEnv,
        LOG_LEVEL: deployEnv === 'production' ? 'info' : 'debug',
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1', // reuse HTTP connections
        ...environment,
      },
    });

    // Attach any extra inline policies
    extraPolicies.forEach((stmt, i) => {
      this.function.addToRolePolicy(stmt);
      // suppress unused-variable warning in CDK; the loop index ensures unique names
      void i;
    });
  }
}
