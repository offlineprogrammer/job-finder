/**
 * Environment variable management
 */

export function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Environment variable ${key} is required`);
  }
  return value;
}

export function getEnvAsNumber(key: string, defaultValue?: number): number {
  const value = getEnv(key, defaultValue?.toString());
  const num = Number(value);
  if (isNaN(num)) {
    throw new Error(`Environment variable ${key} must be a number`);
  }
  return num;
}

export function getEnvAsBoolean(key: string, defaultValue?: boolean): boolean {
  const value = getEnv(key, defaultValue?.toString());
  return value === 'true' || value === '1';
}

export const env = {
  // AWS Configuration
  AWS_REGION: getEnv('AWS_REGION', 'us-east-1'),
  AWS_ACCOUNT_ID: getEnv('AWS_ACCOUNT_ID'),
  
  // Environment
  ENVIRONMENT: getEnv('ENVIRONMENT', 'dev'),
  LOG_LEVEL: getEnv('LOG_LEVEL', 'info'),
  
  // Service Configuration
  JOBS_TABLE_NAME: getEnv('JOBS_TABLE_NAME'),
  USERS_TABLE_NAME: getEnv('USERS_TABLE_NAME'),
  SAVED_SEARCHES_TABLE_NAME: getEnv('SAVED_SEARCHES_TABLE_NAME'),
  OPENSEARCH_DOMAIN: getEnv('OPENSEARCH_DOMAIN'),
  
  // External APIs
  LINKEDIN_API_KEY: getEnv('LINKEDIN_API_KEY', ''),
  LINKEDIN_OAUTH_SECRET: getEnv('LINKEDIN_OAUTH_SECRET', ''),
};
