/**
 * OpenSearch Service
 * Handles all interactions with Amazon OpenSearch
 */

import { Logger } from '@job-finder/utils';
import { env } from '@job-finder/config';
import { Job, SearchJobsRequest, SearchJobsResponse } from '@job-finder/types';
import { buildSearchQuery, buildAggregationQuery } from '../utils/query-builder';

const OPENSEARCH_INDEX = 'jobs';
const OPENSEARCH_ENDPOINT = `https://${env.OPENSEARCH_DOMAIN}`;

export interface OpenSearchHit {
  _id: string;
  _score: number;
  _source: Job;
  sort?: string[];
}

export interface OpenSearchResponse {
  hits: {
    total: {
      value: number;
    };
    hits: OpenSearchHit[];
  };
  aggregations?: Record<string, unknown>;
}

/**
 * Search jobs in OpenSearch
 */
export async function searchJobsInOpenSearch(
  request: SearchJobsRequest,
  logger: Logger
): Promise<SearchJobsResponse> {
  const query = buildSearchQuery(request);
  
  logger.debug('OpenSearch query', { query });

  try {
    const response = await fetch(`${OPENSEARCH_ENDPOINT}/${OPENSEARCH_INDEX}/_search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(query),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('OpenSearch request failed', undefined, {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      throw new Error(`OpenSearch request failed: ${response.status} ${response.statusText}`);
    }

    const data: OpenSearchResponse = await response.json();
    
    const jobs = data.hits.hits.map((hit) => hit._source);
    
    // Generate cursor for pagination (using last hit's sort value)
    let nextCursor: string | undefined;
    if (data.hits.hits.length > 0 && data.hits.hits.length === (request.limit || 20)) {
      const lastHit = data.hits.hits[data.hits.hits.length - 1];
      if (lastHit.sort && lastHit.sort.length > 0) {
        nextCursor = Buffer.from(JSON.stringify(lastHit.sort)).toString('base64');
      }
    }

    return {
      jobs,
      total: data.hits.total.value,
      next_cursor: nextCursor,
    };
  } catch (error) {
    logger.error('OpenSearch search error', error as Error);
    throw error;
  }
}

/**
 * Get aggregations from OpenSearch
 */
export async function getAggregationsFromOpenSearch(
  request: Omit<SearchJobsRequest, 'limit' | 'cursor'>,
  logger: Logger
): Promise<{ locations: Array<{ location: string; count: number }>; salary_ranges: Array<{ range: string; count: number }> }> {
  const query = buildAggregationQuery(request);
  
  logger.debug('OpenSearch aggregation query', { query });

  try {
    const response = await fetch(`${OPENSEARCH_ENDPOINT}/${OPENSEARCH_INDEX}/_search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(query),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('OpenSearch aggregation request failed', undefined, {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      throw new Error(`OpenSearch request failed: ${response.status} ${response.statusText}`);
    }

    const data: OpenSearchResponse = await response.json();
    const aggregations = data.aggregations || {};

    // Parse location aggregations
    const locations: Array<{ location: string; count: number }> = [];
    if (aggregations.locations && typeof aggregations.locations === 'object') {
      const locBuckets = (aggregations.locations as { buckets?: Array<{ key: string; doc_count: number }> }).buckets || [];
      locations.push(...locBuckets.map((bucket) => ({
        location: bucket.key,
        count: bucket.doc_count,
      })));
    }

    // Parse salary range aggregations
    const salaryRanges: Array<{ range: string; count: number }> = [];
    if (aggregations.salary_ranges && typeof aggregations.salary_ranges === 'object') {
      const salaryBuckets = (aggregations.salary_ranges as { buckets?: Array<{ key: string; doc_count: number }> }).buckets || [];
      salaryRanges.push(...salaryBuckets.map((bucket) => ({
        range: bucket.key,
        count: bucket.doc_count,
      })));
    }

    return {
      locations,
      salary_ranges: salaryRanges,
    };
  } catch (error) {
    logger.error('OpenSearch aggregation error', error as Error);
    throw error;
  }
}
