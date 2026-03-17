/**
 * OpenSearch Query Builder
 * Builds OpenSearch query DSL from search parameters
 */

import { SearchJobsRequest } from '@job-finder/types';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@job-finder/config';

export interface OpenSearchQuery {
  query:
    | {
        bool: {
          must?: Array<Record<string, unknown>>;
          filter?: Array<Record<string, unknown>>;
        };
      }
    | { match_all: Record<string, never> };
  size: number;
  from?: number;
  sort?: Array<Record<string, string>>;
  _source?: string[];
  search_after?: string[];
}

/**
 * Build OpenSearch search query from request parameters
 */
export function buildSearchQuery(request: SearchJobsRequest): OpenSearchQuery {
  const limit = Math.min(request.limit || DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
  
  const must: Array<Record<string, unknown>> = [];
  const filter: Array<Record<string, unknown>> = [];

  // Full-text search query
  if (request.q && request.q.trim()) {
    must.push({
      multi_match: {
        query: request.q.trim(),
        fields: ['title^3', 'description^2', 'company^2', 'tags'],
        type: 'best_fields',
        fuzziness: 'AUTO',
      },
    });
  }

  // Location filter
  if (request.location) {
    filter.push({
      term: {
        location: request.location,
      },
    });
  }

  // Remote filter
  if (request.remote !== undefined) {
    filter.push({
      term: {
        remote: request.remote,
      },
    });
  }

  // Salary range filter
  if (request.min_salary !== undefined || request.max_salary !== undefined) {
    const range: Record<string, number> = {};
    if (request.min_salary !== undefined) {
      range.gte = request.min_salary;
    }
    if (request.max_salary !== undefined) {
      range.lte = request.max_salary;
    }
    
    filter.push({
      bool: {
        should: [
          {
            range: {
              min_salary: range,
            },
          },
          {
            range: {
              max_salary: range,
            },
          },
        ],
        minimum_should_match: 1,
      },
    });
  }

  // Provider filter
  if (request.provider) {
    filter.push({
      term: {
        provider_id: request.provider,
      },
    });
  }

  // Posted date filter
  if (request.posted_after) {
    filter.push({
      range: {
        posted_date: {
          gte: request.posted_after,
        },
      },
    });
  }

  // Determine query clause upfront to satisfy the union type
  const queryClause: OpenSearchQuery['query'] =
    must.length === 0 && filter.length === 0
      ? { match_all: {} }
      : {
          bool: {
            ...(must.length > 0 && { must }),
            ...(filter.length > 0 && { filter }),
          },
        };

  const query: OpenSearchQuery = {
    query: queryClause,
    size: limit,
    sort: [
      { _score: 'desc' },
      { posted_date: 'desc' },
    ],
  };

  // Handle pagination cursor (search_after)
  if (request.cursor) {
    try {
      const searchAfter = JSON.parse(Buffer.from(request.cursor, 'base64').toString());
      query.search_after = searchAfter;
    } catch (error) {
      // Invalid cursor, ignore it
    }
  }

  return query;
}

/**
 * Build OpenSearch aggregation query
 */
export function buildAggregationQuery(
  request: Omit<SearchJobsRequest, 'limit' | 'cursor'>
): OpenSearchQuery {
  const baseQuery = buildSearchQuery({ ...request, limit: 0 });
  
  // Add aggregations
  const queryWithAggregations: OpenSearchQuery & { aggs?: Record<string, unknown> } = {
    ...baseQuery,
    aggs: {
      locations: {
        terms: {
          field: 'location',
          size: 20,
        },
      },
      salary_ranges: {
        range: {
          field: 'min_salary',
          ranges: [
            { key: '0-50k', from: 0, to: 50000 },
            { key: '50k-100k', from: 50000, to: 100000 },
            { key: '100k-150k', from: 100000, to: 150000 },
            { key: '150k-200k', from: 150000, to: 200000 },
            { key: '200k+', from: 200000 },
          ],
        },
      },
    },
  };

  return queryWithAggregations;
}
