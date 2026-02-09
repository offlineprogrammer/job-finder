import { SQSEvent, Context } from 'aws-lambda';
import { logger } from '@job-finder/utils';

export const handler = async (event: SQSEvent, _context: Context): Promise<void> => {
  // TODO: Implement SQS handler for job sync
  logger.info('Job sync event received', { recordCount: event.Records.length });
};
