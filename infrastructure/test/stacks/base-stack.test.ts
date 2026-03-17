/**
 * BaseStack CDK assertions
 */

import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { BaseStack } from '../../lib/stacks/base-stack';

function buildTemplate(deployEnv = 'dev'): Template {
  const app = new cdk.App();
  const stack = new BaseStack(app, 'TestBaseStack', {
    deployEnv,
    env: { account: '123456789012', region: 'us-east-1' },
  });
  return Template.fromStack(stack);
}

describe('BaseStack', () => {
  let template: Template;

  beforeAll(() => {
    template = buildTemplate('dev');
  });

  describe('Cognito User Pool', () => {
    it('creates a Cognito User Pool', () => {
      template.resourceCountIs('AWS::Cognito::UserPool', 1);
    });

    it('enables email sign-in', () => {
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        UsernameAttributes: ['email'],
      });
    });

    it('creates an app client', () => {
      template.resourceCountIs('AWS::Cognito::UserPoolClient', 1);
    });

    it('prevents user-existence errors on the app client', () => {
      template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
        PreventUserExistenceErrors: 'ENABLED',
      });
    });
  });

  describe('WAF', () => {
    it('creates a regional WAF WebACL', () => {
      template.hasResourceProperties('AWS::WAFv2::WebACL', {
        Scope: 'REGIONAL',
      });
    });

    it('includes a rate-based rule', () => {
      template.hasResourceProperties('AWS::WAFv2::WebACL', {
        Rules: Match.arrayWith([Match.objectLike({ Name: 'RateLimitByIp' })]),
      });
    });

    it('includes the AWS Managed Common Rule Set', () => {
      template.hasResourceProperties('AWS::WAFv2::WebACL', {
        Rules: Match.arrayWith([Match.objectLike({ Name: 'AWSManagedRulesCommonRuleSet' })]),
      });
    });
  });

  describe('SSM Parameters', () => {
    it('exports the Cognito User Pool ID to SSM', () => {
      template.hasResourceProperties('AWS::SSM::Parameter', {
        Name: '/job-finder/dev/cognito/user-pool-id',
      });
    });
  });

  describe('CloudTrail', () => {
    it('creates a trail', () => {
      template.resourceCountIs('AWS::CloudTrail::Trail', 1);
    });
  });
});
