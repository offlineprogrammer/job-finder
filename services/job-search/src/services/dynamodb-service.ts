/**
 * DynamoDB Service
 * Handles job retrieval from DynamoDB
 */

import { Logger } from '@job-finder/utils';
import { env } from '@job-finder/config';
import { Job } from '@job-finder/types';
import { dynamoDocClient, GetCommand } from '@job-finder/aws-sdk';
import { NotFoundError } from '@job-finder/utils';

const JOBS_TABLE = env.JOBS_TABLE_NAME;

/**
 * Get a single job by ID from DynamoDB
 */
export async function getJobFromDynamoDB(
  jobId: string,
  logger: Logger
): Promise<Job> {
  // Parse composite key: provider_id#job_id
  const parts = jobId.split('#');
  if (parts.length !== 2) {
    throw new Error(`Invalid job_id format: ${jobId}. Expected format: provider_id#job_id`);
  }

  const [providerId, id] = parts;
  const partitionKey = `${providerId}#${id}`;

  logger.debug('Fetching job from DynamoDB', { jobId, partitionKey });

  try {
    const command = new GetCommand({
      TableName: JOBS_TABLE,
      Key: {
        'provider_id#job_id': partitionKey,
      },
    });

    const response = await dynamoDocClient.send(command);

    if (!response.Item) {
      throw new NotFoundError('Job', jobId);
    }

    // Transform DynamoDB item to Job model
    const job: Job = {
      job_id: response.Item['provider_id#job_id'] as string,
      provider_id: response.Item.provider_id as string,
      title: response.Item.title as string,
      description: response.Item.description as string,
      company: response.Item.company as string,
      location: response.Item.location as string,
      remote: response.Item.remote as boolean,
      min_salary: response.Item.min_salary as number | undefined,
      max_salary: response.Item.max_salary as number | undefined,
      posted_date: response.Item.posted_date as string,
      expires_at: response.Item.expires_at as string | undefined,
      apply_url: response.Item.apply_url as string,
      tags: response.Item.tags as string[] | undefined,
    };

    return job;
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    logger.error('DynamoDB get job error', error as Error, { jobId });
    throw error;
  }
}

/**
 * Batch get jobs from DynamoDB
 */
export async function batchGetJobsFromDynamoDB(
  jobIds: string[],
  logger: Logger
): Promise<Job[]> {
  if (jobIds.length === 0) {
    return [];
  }

  logger.debug('Batch getting jobs from DynamoDB', { count: jobIds.length });

  // Parse composite keys
  const keys = jobIds.map((jobId) => {
    const parts = jobId.split('#');
    if (parts.length !== 2) {
      throw new Error(`Invalid job_id format: ${jobId}`);
    }
    const [providerId, id] = parts;
    return {
      'provider_id#job_id': `${providerId}#${id}`,
    };
  });

  try {
    // DynamoDB BatchGetItem can handle up to 100 items
    // For simplicity, we'll process in batches of 100
    const batchSize = 100;
    const batches: Job[] = [];

    for (let i = 0; i < keys.length; i += batchSize) {
      const batch = keys.slice(i, i + batchSize);
      
      // Note: Using @aws-sdk/lib-dynamodb's BatchGetCommand would be ideal
      // For now, we'll use individual GetCommands (can be optimized later)
      const jobs = await Promise.all(
        batch.map(async (key) => {
          const command = new GetCommand({
            TableName: JOBS_TABLE,
            Key: key,
          });
          const response = await dynamoDocClient.send(command);
          return response.Item as Job | undefined;
        })
      );

      batches.push(...jobs.filter((job): job is Job => job !== undefined));
    }

    return batches;
  } catch (error) {
    logger.error('DynamoDB batch get jobs error', error as Error);
    throw error;
  }
}
