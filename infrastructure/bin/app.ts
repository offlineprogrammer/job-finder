#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { environments } from './environments';
import { BaseStack } from '../lib/stacks/base-stack';
import { DataStack } from '../lib/stacks/data-stack';
import { ApiStack } from '../lib/stacks/api-stack';
import { JobSearchStack } from '../lib/stacks/job-search-stack';

const app = new cdk.App();

// -----------------------------------------------------------------------
// Resolve environment from CDK context
//   cdk deploy --context env=production
// -----------------------------------------------------------------------
const deployEnv = (app.node.tryGetContext('env') as string | undefined) ?? 'dev';
const envConfig = environments[deployEnv as keyof typeof environments];

if (!envConfig) {
  throw new Error(
    `Unknown environment "${deployEnv}". Valid values: ${Object.keys(environments).join(', ')}`
  );
}

const env: cdk.Environment = {
  account: envConfig.account,
  region:  envConfig.region,
};

// -----------------------------------------------------------------------
// Stack instantiation — order determines implicit cross-stack dependencies
// -----------------------------------------------------------------------

// 1. Base — Cognito, WAF, CloudTrail
const baseStack = new BaseStack(app, `JobFinder-${deployEnv}-Base`, {
  env,
  deployEnv,
  description: 'Job Finder Platform – base security & identity resources',
  tags: { Environment: deployEnv },
});

// 2. Data — DynamoDB tables, OpenSearch domain
const dataStack = new DataStack(app, `JobFinder-${deployEnv}-Data`, {
  env,
  deployEnv,
  description: 'Job Finder Platform – DynamoDB tables and OpenSearch domain',
});
dataStack.addDependency(baseStack);

// 3. API — shared API Gateway, Cognito authorizer, WAF association
const apiStack = new ApiStack(app, `JobFinder-${deployEnv}-Api`, {
  env,
  deployEnv,
  description: 'Job Finder Platform – API Gateway and shared request handling',
  userPool:   baseStack.userPool,
  webAclArn:  baseStack.webAcl.attrArn,
});
apiStack.addDependency(baseStack);

// 4. Job Search Service
const jobSearchStack = new JobSearchStack(app, `JobFinder-${deployEnv}-JobSearch`, {
  env,
  deployEnv,
  description: 'Job Finder Platform – Job Search Lambda and API routes',
  api:               apiStack.api,
  authorizer:        apiStack.authorizer,
  requestValidator:  apiStack.requestValidator,
  jobsTable:         dataStack.jobsTable,
  openSearchDomain:  dataStack.openSearchDomain,
  userPool:          baseStack.userPool,
});
jobSearchStack.addDependency(dataStack);
jobSearchStack.addDependency(apiStack);

app.synth();
