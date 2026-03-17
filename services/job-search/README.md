# Job Search Service

The Job Search Service handles job search and retrieval functionality for the Job Finder Platform.

## Responsibilities

- Search jobs by keywords, filters (location, salary, remote, date range)
- Retrieve individual job details
- Provide job aggregations (location counts, salary ranges)
- Handle pagination and result ranking

## API Endpoints

### GET /api/v1/jobs

Search jobs with filters.

**Query Parameters:**
- `q` (string, optional): Search query (keywords)
- `location` (string, optional): Location filter
- `remote` (boolean, optional): Remote-only filter
- `min_salary` (number, optional): Minimum salary filter
- `max_salary` (number, optional): Maximum salary filter
- `provider` (string, optional): Filter by provider
- `posted_after` (ISO8601, optional): Jobs posted after date
- `limit` (number, default: 20): Results per page (max: 100)
- `cursor` (string, optional): Pagination cursor

**Response:**
```json
{
  "jobs": [...],
  "total": 150,
  "next_cursor": "..."
}
```

### GET /api/v1/jobs/{job_id}

Get detailed job information.

**Path Parameters:**
- `job_id` (string): Composite ID (provider#job_id)

**Response:**
```json
{
  "job": {
    "job_id": "linkedin#12345",
    "title": "Senior Software Engineer",
    ...
  }
}
```

### GET /api/v1/jobs/aggregations

Get job statistics (location counts, salary ranges).

**Query Parameters:** Same filters as search endpoint

**Response:**
```json
{
  "locations": [
    { "location": "San Francisco, CA", "count": 45 }
  ],
  "salary_ranges": [
    { "range": "100k-150k", "count": 30 }
  ]
}
```

## Architecture

- **OpenSearch**: Primary data store for search queries
- **DynamoDB**: Source of truth for job details
- **Lambda**: Serverless compute (1024MB, 15s timeout)

## Local Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Type check
npm run typecheck
```

## Environment Variables

- `JOBS_TABLE_NAME`: DynamoDB table name for jobs
- `OPENSEARCH_DOMAIN`: OpenSearch domain endpoint
- `AWS_REGION`: AWS region (default: us-east-1)

## Dependencies

- `@job-finder/types`: Shared type definitions
- `@job-finder/utils`: Shared utilities (logger, errors)
- `@job-finder/aws-sdk`: AWS SDK wrappers
- `@job-finder/config`: Configuration management
