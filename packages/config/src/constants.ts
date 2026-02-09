/**
 * Application constants
 */

export const API_VERSION = 'v1';

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export const JOB_TTL_DAYS = 90; // Jobs expire after 90 days

export const SYNC_INTERVAL_HOURS = 6; // Sync jobs every 6 hours

export const PROVIDERS = {
  LINKEDIN: 'linkedin',
  MOCK: 'mock',
} as const;

export type Provider = typeof PROVIDERS[keyof typeof PROVIDERS];
