import * as cdk from 'aws-cdk-lib';

/**
 * Standard tags for all resources
 */
export interface StandardTags {
  Project: string;
  Environment: string;
  ManagedBy: string;
  Owner?: string;
}

/**
 * Apply standard tags to a construct
 */
export function applyStandardTags(
  construct: cdk.Construct,
  environment: string,
  additionalTags?: Record<string, string>
): void {
  const tags: StandardTags = {
    Project: 'job-finder',
    Environment: environment,
    ManagedBy: 'cdk',
  };

  const allTags = { ...tags, ...additionalTags };

  Object.entries(allTags).forEach(([key, value]) => {
    if (value) {
      cdk.Tags.of(construct).add(key, value);
    }
  });
}
