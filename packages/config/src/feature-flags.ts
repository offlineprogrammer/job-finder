/**
 * Feature flags
 */

export interface FeatureFlags {
  enableNotifications: boolean;
  enableJobAlerts: boolean;
  enableAdvancedSearch: boolean;
}

export function getFeatureFlags(): FeatureFlags {
  return {
    enableNotifications: process.env.ENABLE_NOTIFICATIONS === 'true',
    enableJobAlerts: process.env.ENABLE_JOB_ALERTS === 'true',
    enableAdvancedSearch: process.env.ENABLE_ADVANCED_SEARCH === 'true',
  };
}
