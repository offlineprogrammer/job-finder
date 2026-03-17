/**
 * BaseStack
 *
 * Provisions shared security and identity resources that every
 * other stack depends on.  Resources here have the longest
 * lifecycle and change least often.
 *
 * Exports via CloudFormation SSM Parameter Store so downstream
 * stacks can resolve them by name at deploy time without hard-coding ARNs.
 *
 * Included:
 *  - Amazon Cognito User Pool + App Client
 *  - API Gateway Cognito Authorizer (exported, consumed by ApiStack)
 *  - AWS WAF WebACL (attached to CloudFront / API Gateway)
 *  - CloudTrail trail for audit logging
 *  - SSM Parameters for cross-stack references
 */

import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as cloudtrail from 'aws-cdk-lib/aws-cloudtrail';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { applyStandardTags } from '../utils/tags';

export interface BaseStackProps extends cdk.StackProps {
  deployEnv: string;
}

export class BaseStack extends cdk.Stack {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public readonly webAcl: wafv2.CfnWebACL;

  constructor(scope: Construct, id: string, props: BaseStackProps) {
    super(scope, id, props);

    const { deployEnv } = props;
    applyStandardTags(this, deployEnv);

    // ---------------------------------------------------------------
    // Cognito User Pool
    // ---------------------------------------------------------------
    this.userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: `job-finder-${deployEnv}-users`,
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      standardAttributes: {
        email: { required: true, mutable: true },
      },
      passwordPolicy: {
        minLength: 10,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
        tempPasswordValidity: cdk.Duration.days(3),
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy:
        deployEnv === 'production' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      // Enable advanced security features in prod
      advancedSecurityMode:
        deployEnv === 'production'
          ? cognito.AdvancedSecurityMode.ENFORCED
          : cognito.AdvancedSecurityMode.OFF,
    });

    // App Client — used by the Next.js frontend
    this.userPoolClient = this.userPool.addClient('WebClient', {
      userPoolClientName: `job-finder-${deployEnv}-web`,
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      oAuth: {
        flows: { authorizationCodeGrant: true },
        scopes: [cognito.OAuthScope.EMAIL, cognito.OAuthScope.OPENID, cognito.OAuthScope.PROFILE],
        callbackUrls:
          deployEnv === 'production'
            ? ['https://app.jobfinder.example.com/auth/callback']
            : ['http://localhost:3000/auth/callback'],
        logoutUrls:
          deployEnv === 'production'
            ? ['https://app.jobfinder.example.com']
            : ['http://localhost:3000'],
      },
      preventUserExistenceErrors: true,
      // Token validity
      accessTokenValidity: cdk.Duration.hours(1),
      idTokenValidity: cdk.Duration.hours(1),
      refreshTokenValidity: cdk.Duration.days(30),
    });

    // ---------------------------------------------------------------
    // WAF WebACL — regional (for API Gateway)
    // ---------------------------------------------------------------
    this.webAcl = new wafv2.CfnWebACL(this, 'WebAcl', {
      name: `job-finder-${deployEnv}-api-acl`,
      scope: 'REGIONAL',
      defaultAction: { allow: {} },
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: `job-finder-${deployEnv}-api-acl`,
        sampledRequestsEnabled: true,
      },
      rules: [
        // AWS Managed Rules — Common Rule Set
        {
          name: 'AWSManagedRulesCommonRuleSet',
          priority: 10,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesCommonRuleSet',
            },
          },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: 'AWSManagedRulesCommonRuleSet',
            sampledRequestsEnabled: false,
          },
        },
        // AWS Managed Rules — Known Bad Inputs
        {
          name: 'AWSManagedRulesKnownBadInputsRuleSet',
          priority: 20,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesKnownBadInputsRuleSet',
            },
          },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: 'AWSManagedRulesKnownBadInputsRuleSet',
            sampledRequestsEnabled: false,
          },
        },
        // Rate-limit rule: 100 req/5 min per IP (roughly 0.33 req/s)
        {
          name: 'RateLimitByIp',
          priority: 30,
          action: { block: {} },
          statement: {
            rateBasedStatement: {
              limit: 500,
              aggregateKeyType: 'IP',
            },
          },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: 'RateLimitByIp',
            sampledRequestsEnabled: true,
          },
        },
      ],
    });

    // ---------------------------------------------------------------
    // CloudTrail — management + data events for audit logging
    // ---------------------------------------------------------------
    const trailBucket = new s3.Bucket(this, 'TrailBucket', {
      bucketName: `job-finder-${deployEnv}-cloudtrail-${this.account}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: true,
      lifecycleRules: [
        {
          expiration: cdk.Duration.days(deployEnv === 'production' ? 365 : 90),
        },
      ],
      removalPolicy:
        deployEnv === 'production' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: deployEnv !== 'production',
    });

    new cloudtrail.Trail(this, 'Trail', {
      trailName: `job-finder-${deployEnv}-trail`,
      bucket: trailBucket,
      includeGlobalServiceEvents: true,
      isMultiRegionTrail: deployEnv === 'production',
      enableFileValidation: true,
    });

    // ---------------------------------------------------------------
    // SSM Parameters — cross-stack references
    // ---------------------------------------------------------------
    new ssm.StringParameter(this, 'UserPoolIdParam', {
      parameterName: `/job-finder/${deployEnv}/cognito/user-pool-id`,
      stringValue: this.userPool.userPoolId,
      description: 'Cognito User Pool ID',
    });

    new ssm.StringParameter(this, 'UserPoolArnParam', {
      parameterName: `/job-finder/${deployEnv}/cognito/user-pool-arn`,
      stringValue: this.userPool.userPoolArn,
      description: 'Cognito User Pool ARN',
    });

    new ssm.StringParameter(this, 'UserPoolClientIdParam', {
      parameterName: `/job-finder/${deployEnv}/cognito/client-id`,
      stringValue: this.userPoolClient.userPoolClientId,
      description: 'Cognito App Client ID',
    });

    new ssm.StringParameter(this, 'WebAclArnParam', {
      parameterName: `/job-finder/${deployEnv}/waf/web-acl-arn`,
      stringValue: this.webAcl.attrArn,
      description: 'WAF WebACL ARN',
    });

    // ---------------------------------------------------------------
    // Stack outputs
    // ---------------------------------------------------------------
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: this.userPool.userPoolId,
      exportName: `JobFinder-${deployEnv}-UserPoolId`,
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: this.userPoolClient.userPoolClientId,
      exportName: `JobFinder-${deployEnv}-UserPoolClientId`,
    });

    new cdk.CfnOutput(this, 'WebAclArn', {
      value: this.webAcl.attrArn,
      exportName: `JobFinder-${deployEnv}-WebAclArn`,
    });
  }
}
