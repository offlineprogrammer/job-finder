/**
 * Resource naming utilities for consistent naming across stacks
 */

export interface NamingOptions {
  service?: string;
  resource: string;
  environment: string;
}

/**
 * Generate a consistent resource name
 */
export function getResourceName(options: NamingOptions): string {
  const { service, resource, environment } = options;
  const parts = ['job-finder', environment];

  if (service) {
    parts.push(service);
  }

  parts.push(resource);

  return parts.join('-');
}

/**
 * Generate a resource ID for CDK
 */
export function getResourceId(options: NamingOptions): string {
  const { service, resource, environment } = options;
  const parts = ['JobFinder', environment.charAt(0).toUpperCase() + environment.slice(1)];

  if (service) {
    parts.push(service.charAt(0).toUpperCase() + service.slice(1).replace(/-/g, ''));
  }

  parts.push(resource.charAt(0).toUpperCase() + resource.slice(1).replace(/-/g, ''));

  return parts.join('');
}
