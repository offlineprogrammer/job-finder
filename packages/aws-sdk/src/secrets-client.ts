/**
 * Secrets Manager client wrapper
 */

import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const client = new SecretsManagerClient({});

export async function getSecret(secretId: string): Promise<string> {
  const command = new GetSecretValueCommand({ SecretId: secretId });
  const response = await client.send(command);

  if (response.SecretString) {
    return response.SecretString;
  }

  if (response.SecretBinary) {
    return Buffer.from(response.SecretBinary).toString('utf-8');
  }

  throw new Error(`Secret ${secretId} has no string or binary value`);
}

export async function getSecretJSON<T = unknown>(secretId: string): Promise<T> {
  const secretString = await getSecret(secretId);
  return JSON.parse(secretString) as T;
}
