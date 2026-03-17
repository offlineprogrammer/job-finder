/**
 * Reusable DynamoDB Table Construct
 * Wraps aws-cdk-lib DynamoDB with project-standard defaults:
 * - On-demand billing (no capacity planning)
 * - Point-in-time recovery enabled
 * - KMS-managed encryption
 * - Deletion protection in production
 */

import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

export interface JobFinderTableProps {
  tableName: string;
  partitionKey: dynamodb.Attribute;
  sortKey?: dynamodb.Attribute;
  gsis?: dynamodb.GlobalSecondaryIndexProps[];
  ttlAttribute?: string;
  deployEnv: string;
}

export class JobFinderTable extends Construct {
  public readonly table: dynamodb.Table;

  constructor(scope: Construct, id: string, props: JobFinderTableProps) {
    super(scope, id);

    const { tableName, partitionKey, sortKey, gsis = [], ttlAttribute, deployEnv } = props;

    this.table = new dynamodb.Table(this, 'Table', {
      tableName: `job-finder-${deployEnv}-${tableName}`,
      partitionKey,
      sortKey,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      timeToLiveAttribute: ttlAttribute,
      removalPolicy: deployEnv === 'production'
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
      deletionProtection: deployEnv === 'production',
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,  // for future event sourcing
    });

    gsis.forEach((gsi) => this.table.addGlobalSecondaryIndex(gsi));
  }
}
