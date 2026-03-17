/**
 * DataStack CDK assertions
 *
 * Verifies that the synthesised CloudFormation template contains the
 * expected DynamoDB tables, GSIs, and OpenSearch domain configuration.
 */

import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { DataStack } from '../../lib/stacks/data-stack';

function buildTemplate(deployEnv = 'dev'): Template {
  const app = new cdk.App();
  const stack = new DataStack(app, 'TestDataStack', {
    deployEnv,
    env: { account: '123456789012', region: 'us-east-1' },
  });
  return Template.fromStack(stack);
}

describe('DataStack', () => {
  let template: Template;

  beforeAll(() => {
    template = buildTemplate('dev');
  });

  // -----------------------------------------------------------------------
  // DynamoDB Tables
  // -----------------------------------------------------------------------
  describe('DynamoDB tables', () => {
    it('creates the jobs table with the correct partition key', () => {
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        KeySchema: Match.arrayWith([
          Match.objectLike({ AttributeName: 'provider_id#job_id', KeyType: 'HASH' }),
          Match.objectLike({ AttributeName: 'posted_date',        KeyType: 'RANGE' }),
        ]),
      });
    });

    it('creates the jobs table with two GSIs', () => {
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        GlobalSecondaryIndexes: Match.arrayWith([
          Match.objectLike({ IndexName: 'location-remote-index' }),
          Match.objectLike({ IndexName: 'company-index' }),
        ]),
      });
    });

    it('enables TTL on the jobs table', () => {
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TimeToLiveSpecification: {
          AttributeName: 'expires_at',
          Enabled: true,
        },
      });
    });

    it('creates the users table', () => {
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        KeySchema: Match.arrayWith([
          Match.objectLike({ AttributeName: 'user_id', KeyType: 'HASH' }),
        ]),
      });
    });

    it('creates the saved_searches table with composite key', () => {
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        KeySchema: Match.arrayWith([
          Match.objectLike({ AttributeName: 'user_id',   KeyType: 'HASH' }),
          Match.objectLike({ AttributeName: 'search_id', KeyType: 'RANGE' }),
        ]),
      });
    });

    it('uses on-demand billing for all tables', () => {
      template.resourcePropertiesCountIs(
        'AWS::DynamoDB::Table',
        { BillingMode: 'PAY_PER_REQUEST' },
        4   // jobs, users, saved_searches, sync_metadata
      );
    });

    it('enables point-in-time recovery on all tables', () => {
      template.resourcePropertiesCountIs(
        'AWS::DynamoDB::Table',
        {
          PointInTimeRecoverySpecification: { PointInTimeRecoveryEnabled: true },
        },
        4
      );
    });

    it('enables DynamoDB Streams on all tables', () => {
      template.resourcePropertiesCountIs(
        'AWS::DynamoDB::Table',
        { StreamSpecification: Match.objectLike({ StreamViewType: 'NEW_AND_OLD_IMAGES' }) },
        4
      );
    });
  });

  // -----------------------------------------------------------------------
  // OpenSearch Domain
  // -----------------------------------------------------------------------
  describe('OpenSearch domain', () => {
    it('creates an OpenSearch 2.11 domain', () => {
      template.hasResourceProperties('AWS::OpenSearchService::Domain', {
        EngineVersion: 'OpenSearch_2.11',
      });
    });

    it('enables encryption at rest', () => {
      template.hasResourceProperties('AWS::OpenSearchService::Domain', {
        EncryptionAtRestOptions: { Enabled: true },
      });
    });

    it('enables node-to-node encryption', () => {
      template.hasResourceProperties('AWS::OpenSearchService::Domain', {
        NodeToNodeEncryptionOptions: { Enabled: true },
      });
    });

    it('enforces HTTPS', () => {
      template.hasResourceProperties('AWS::OpenSearchService::Domain', {
        DomainEndpointOptions: Match.objectLike({ EnforceHTTPS: true }),
      });
    });

    it('uses zone awareness (multi-AZ)', () => {
      template.hasResourceProperties('AWS::OpenSearchService::Domain', {
        ClusterConfig: Match.objectLike({
          ZoneAwarenessEnabled: true,
        }),
      });
    });
  });

  // -----------------------------------------------------------------------
  // SSM Parameters
  // -----------------------------------------------------------------------
  describe('SSM Parameters', () => {
    it('exports the jobs table name to SSM', () => {
      template.hasResourceProperties('AWS::SSM::Parameter', {
        Name: '/job-finder/dev/dynamodb/jobs-table-name',
        Type: 'String',
      });
    });

    it('exports the OpenSearch endpoint to SSM', () => {
      template.hasResourceProperties('AWS::SSM::Parameter', {
        Name: '/job-finder/dev/opensearch/domain-endpoint',
        Type: 'String',
      });
    });
  });
});
