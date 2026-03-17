/**
 * Request validation utilities
 */

import { ValidationError } from '@job-finder/utils';
import { SearchJobsRequest } from '@job-finder/types';
import { MAX_PAGE_SIZE, DEFAULT_PAGE_SIZE } from '@job-finder/config';

/**
 * Validate search jobs request
 */
export function validateSearchRequest(request: Partial<SearchJobsRequest>): SearchJobsRequest {
  const validated: SearchJobsRequest = {
    limit: DEFAULT_PAGE_SIZE,
  };

  // Validate query string
  if (request.q !== undefined) {
    if (typeof request.q !== 'string') {
      throw new ValidationError('Query parameter "q" must be a string');
    }
    if (request.q.length > 200) {
      throw new ValidationError('Query parameter "q" must be less than 200 characters');
    }
    validated.q = request.q;
  }

  // Validate location
  if (request.location !== undefined) {
    if (typeof request.location !== 'string') {
      throw new ValidationError('Query parameter "location" must be a string');
    }
    validated.location = request.location;
  }

  // Validate remote
  if (request.remote !== undefined) {
    if (typeof request.remote !== 'boolean' && request.remote !== 'true' && request.remote !== 'false') {
      throw new ValidationError('Query parameter "remote" must be a boolean');
    }
    validated.remote = request.remote === true || request.remote === 'true';
  }

  // Validate salary range
  if (request.min_salary !== undefined) {
    const minSalary = Number(request.min_salary);
    if (isNaN(minSalary) || minSalary < 0) {
      throw new ValidationError('Query parameter "min_salary" must be a positive number');
    }
    validated.min_salary = minSalary;
  }

  if (request.max_salary !== undefined) {
    const maxSalary = Number(request.max_salary);
    if (isNaN(maxSalary) || maxSalary < 0) {
      throw new ValidationError('Query parameter "max_salary" must be a positive number');
    }
    validated.max_salary = maxSalary;
  }

  // Validate salary range consistency
  if (validated.min_salary !== undefined && validated.max_salary !== undefined) {
    if (validated.min_salary > validated.max_salary) {
      throw new ValidationError('min_salary must be less than or equal to max_salary');
    }
  }

  // Validate provider
  if (request.provider !== undefined) {
    if (typeof request.provider !== 'string') {
      throw new ValidationError('Query parameter "provider" must be a string');
    }
    validated.provider = request.provider;
  }

  // Validate posted_after (ISO8601 date)
  if (request.posted_after !== undefined) {
    if (typeof request.posted_after !== 'string') {
      throw new ValidationError('Query parameter "posted_after" must be an ISO8601 date string');
    }
    const date = new Date(request.posted_after);
    if (isNaN(date.getTime())) {
      throw new ValidationError('Query parameter "posted_after" must be a valid ISO8601 date');
    }
    validated.posted_after = request.posted_after;
  }

  // Validate limit
  if (request.limit !== undefined) {
    const limit = Number(request.limit);
    if (isNaN(limit) || limit < 1 || limit > MAX_PAGE_SIZE) {
      throw new ValidationError(`Query parameter "limit" must be between 1 and ${MAX_PAGE_SIZE}`);
    }
    validated.limit = limit;
  } else {
    validated.limit = DEFAULT_PAGE_SIZE;
  }

  // Validate cursor
  if (request.cursor !== undefined) {
    if (typeof request.cursor !== 'string') {
      throw new ValidationError('Query parameter "cursor" must be a string');
    }
    validated.cursor = request.cursor;
  }

  return validated;
}
