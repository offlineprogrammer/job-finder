export interface EnvironmentConfig {
  account: string;
  region: string;
}

export const environments: Record<string, EnvironmentConfig> = {
  dev: {
    account: process.env.CDK_DEFAULT_ACCOUNT || '123456789012',
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  staging: {
    account: process.env.CDK_DEFAULT_ACCOUNT || '123456789012',
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  production: {
    account: process.env.CDK_DEFAULT_ACCOUNT || '987654321098',
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
};
