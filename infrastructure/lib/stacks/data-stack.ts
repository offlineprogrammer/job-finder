/**
 * DataStack
 *
 * Provisions all durable data stores consumed by every Lambda service:
 *
 *  DynamoDB Tables
 *  ───────────────
 *  • jobs              — source-of-truth for synced job listings
 *  • users             — user profile & preferences
 *  • saved_searches    — user-created saved searches
 *  • sync_metadata     — last-sync timestamps per provider
 *
 *  Amazon OpenSearch
 *  ─────────────────
 *  • Single domain used for full-text job search
 *  • Multi-AZ data nodes, encryption at rest & in transit
 *  • Fine-grained access control backed by an IAM master user
 *
 * Cross-stack references are exported via SSM Parameter Store.
 */

import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as opensearch from 'aws-cdk-lib/aws-opensearchservice';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { JobFinderTable } from '../constructs/dynamodb-table';
import { applyStandardTags } from '../utils/tags';

export interface DataStackProps extends cdk.StackProps {
  deployEnv: string;
}

export class DataStack extends cdk.Stack {
  // DynamoDB tables
  public readonly jobsTable: cdk.aws_dynamodb.Table;
  public readonly usersTable: cdk.aws_dynamodb.Table;
  public readonly savedSearchesTable: cdk.aws_dynamodb.Table;
  public readonly syncMetadataTable: cdk.aws_dynamodb.Table;

  // OpenSearch
  public readonly openSearchDomain: opensearch.Domain;

  constructor(scope: Construct, id: string, props: DataStackProps) {
    super(scope, id, props);

    const { deployEnv } = props;
    applyStandardTags(this, deployEnv);

    // ---------------------------------------------------------------
    // DynamoDB: jobs
    //   PK  : provider_id#job_id   (string)
    //   SK  : posted_date          (string, ISO8601)
    //   GSI1: location + remote    — filter by location & remote flag
    //   GSI2: company              — filter by company
    //   TTL : expires_at
    // ---------------------------------------------------------------
    const jobsTableConstruct = new JobFinderTable(this, 'JobsTable', {
      tableName: 'jobs',
      partitionKey: { name: 'provider_id#job_id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'posted_date', type: dynamodb.AttributeType.STRING },
      ttlAttribute: 'expires_at',
      deployEnv,
      gsis: [
        {
          indexName: 'location-remote-index',
          partitionKey: { name: 'location', type: dynamodb.AttributeType.STRING },
          sortKey: { name: 'remote', type: dynamodb.AttributeType.NUMBER },
          projectionType: dynamodb.ProjectionType.INCLUDE,
          nonKeyAttributes: [
            'provider_id#job_id',
            'title',
            'company',
            'min_salary',
            'max_salary',
            'posted_date',
          ],
        },
        {
          indexName: 'company-index',
          partitionKey: { name: 'company', type: dynamodb.AttributeType.STRING },
          sortKey: { name: 'posted_date', type: dynamodb.AttributeType.STRING },
          projectionType: dynamodb.ProjectionType.INCLUDE,
          nonKeyAttributes: [
            'provider_id#job_id',
            'title',
            'location',
            'remote',
            'min_salary',
            'max_salary',
          ],
        },
      ],
    });
    this.jobsTable = jobsTableConstruct.table;

    // ---------------------------------------------------------------
    // DynamoDB: users
    //   PK: user_id  (Cognito sub, string)
    // ---------------------------------------------------------------
    const usersTableConstruct = new JobFinderTable(this, 'UsersTable', {
      tableName: 'users',
      partitionKey: { name: 'user_id', type: dynamodb.AttributeType.STRING },
      deployEnv,
    });
    this.usersTable = usersTableConstruct.table;

    // ---------------------------------------------------------------
    // DynamoDB: saved_searches
    //   PK: user_id    (string)
    //   SK: search_id  (UUID string)
    // ---------------------------------------------------------------
    const savedSearchesConstruct = new JobFinderTable(this, 'SavedSearchesTable', {
      tableName: 'saved-searches',
      partitionKey: { name: 'user_id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'search_id', type: dynamodb.AttributeType.STRING },
      deployEnv,
    });
    this.savedSearchesTable = savedSearchesConstruct.table;

    // ---------------------------------------------------------------
    // DynamoDB: sync_metadata
    //   PK: provider_id  (string)
    // ---------------------------------------------------------------
    const syncMetaConstruct = new JobFinderTable(this, 'SyncMetadataTable', {
      tableName: 'sync-metadata',
      partitionKey: { name: 'provider_id', type: dynamodb.AttributeType.STRING },
      deployEnv,
    });
    this.syncMetadataTable = syncMetaConstruct.table;

    // ---------------------------------------------------------------
    // OpenSearch Domain
    // ---------------------------------------------------------------
    const isProd = deployEnv === 'production';

    // IAM master user for fine-grained access control
    const openSearchMasterRole = new iam.Role(this, 'OpenSearchMasterRole', {
      roleName: `job-finder-${deployEnv}-opensearch-master`,
      assumedBy: new iam.AccountRootPrincipal(),
      description: 'Master role for OpenSearch fine-grained access control',
    });

    this.openSearchDomain = new opensearch.Domain(this, 'JobsDomain', {
      domainName: `job-finder-${deployEnv}-jobs`,
      version: opensearch.EngineVersion.OPENSEARCH_2_11,

      // Compute
      capacity: {
        dataNodes: isProd ? 3 : 2,
        dataNodeInstanceType: isProd ? 't3.medium.search' : 't3.small.search',
        multiAzWithStandbyEnabled: false,
      },

      // Storage
      ebs: {
        volumeSize: isProd ? 100 : 20, // GB per node
        volumeType: cdk.aws_ec2.EbsDeviceVolumeType.GP3,
      },

      // Multi-AZ
      zoneAwareness: {
        enabled: true,
        availabilityZoneCount: isProd ? 3 : 2,
      },

      // Security
      encryptionAtRest: { enabled: true },
      nodeToNodeEncryption: true,
      enforceHttps: true,
      fineGrainedAccessControl: {
        masterUserArn: openSearchMasterRole.roleArn,
      },

      // Logging
      logging: {
        slowSearchLogEnabled: true,
        appLogEnabled: true,
        slowIndexLogEnabled: true,
      },

      // Automatic software updates
      enableAutoSoftwareUpdate: true,

      removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // ---------------------------------------------------------------
    // SSM Parameters — cross-stack references
    // ---------------------------------------------------------------
    const ssmPrefix = `/job-finder/${deployEnv}`;

    new ssm.StringParameter(this, 'JobsTableNameParam', {
      parameterName: `${ssmPrefix}/dynamodb/jobs-table-name`,
      stringValue: this.jobsTable.tableName,
    });

    new ssm.StringParameter(this, 'JobsTableArnParam', {
      parameterName: `${ssmPrefix}/dynamodb/jobs-table-arn`,
      stringValue: this.jobsTable.tableArn,
    });

    new ssm.StringParameter(this, 'UsersTableNameParam', {
      parameterName: `${ssmPrefix}/dynamodb/users-table-name`,
      stringValue: this.usersTable.tableName,
    });

    new ssm.StringParameter(this, 'SavedSearchesTableNameParam', {
      parameterName: `${ssmPrefix}/dynamodb/saved-searches-table-name`,
      stringValue: this.savedSearchesTable.tableName,
    });

    new ssm.StringParameter(this, 'SyncMetadataTableNameParam', {
      parameterName: `${ssmPrefix}/dynamodb/sync-metadata-table-name`,
      stringValue: this.syncMetadataTable.tableName,
    });

    new ssm.StringParameter(this, 'OpenSearchDomainEndpointParam', {
      parameterName: `${ssmPrefix}/opensearch/domain-endpoint`,
      stringValue: this.openSearchDomain.domainEndpoint,
    });

    new ssm.StringParameter(this, 'OpenSearchDomainArnParam', {
      parameterName: `${ssmPrefix}/opensearch/domain-arn`,
      stringValue: this.openSearchDomain.domainArn,
    });

    // ---------------------------------------------------------------
    // Stack outputs
    // ---------------------------------------------------------------
    new cdk.CfnOutput(this, 'JobsTableName', {
      value: this.jobsTable.tableName,
      exportName: `JobFinder-${deployEnv}-JobsTableName`,
    });

    new cdk.CfnOutput(this, 'OpenSearchEndpoint', {
      value: this.openSearchDomain.domainEndpoint,
      exportName: `JobFinder-${deployEnv}-OpenSearchEndpoint`,
    });
  }
}
