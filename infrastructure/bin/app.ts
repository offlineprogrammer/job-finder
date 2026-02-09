#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { environments } from './environments';

// Import stacks (to be created)
// import { BaseStack } from '../lib/stacks/base-stack';
// import { DataStack } from '../lib/stacks/data-stack';
// import { ApiStack } from '../lib/stacks/api-stack';

const app = new cdk.App();

// Get environment from context or default to dev
const envName = app.node.tryGetContext('env') || 'dev';
const envConfig = environments[envName as keyof typeof environments];

if (!envConfig) {
  throw new Error(`Unknown environment: ${envName}`);
}

const env: cdk.Environment = {
  account: envConfig.account,
  region: envConfig.region,
};

// TODO: Create stacks
// const baseStack = new BaseStack(app, 'JobFinderBase', { env });
// const dataStack = new DataStack(app, 'JobFinderData', { env });
// const apiStack = new ApiStack(app, 'JobFinderApi', { env });

app.synth();
