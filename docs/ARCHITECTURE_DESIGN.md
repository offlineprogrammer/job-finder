# AWS Serverless-First Architecture: Detailed Design

## Architecture Overview

This document defines the production-ready serverless-first architecture for the Job Finder Platform, including service responsibilities, data flows, failure modes, and operational considerations.

---

## Text-Based Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
│                                                                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐        │
│  │   Web Browser    │  │  Mobile App      │  │   API Clients    │        │
│  │   (Next.js)      │  │  (Future)        │  │   (Future)       │        │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘        │
│           │                      │                      │                   │
│           └──────────────────────┼──────────────────────┘                   │
│                                  │                                          │
│                                  │ HTTPS                                    │
└──────────────────────────────────┼──────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          EDGE & SECURITY LAYER                               │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │                    CloudFront Distribution                         │    │
│  │  - Static assets (Next.js build)                                  │    │
│  │  - Caching (TTL: 1h for static, 5m for API)                      │    │
│  │  - WAF integration                                                 │    │
│  └────────────────────────────┬───────────────────────────────────────┘    │
│                               │                                             │
│  ┌────────────────────────────▼───────────────────────────────────────┐    │
│  │                         AWS WAF                                     │    │
│  │  - Rate limiting (100 req/min per IP)                              │    │
│  │  - DDoS protection                                                  │    │
│  │  - SQL injection / XSS protection                                  │    │
│  └────────────────────────────┬───────────────────────────────────────┘    │
└────────────────────────────────┼─────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          API GATEWAY LAYER                                   │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │                  Amazon API Gateway (REST API)                      │    │
│  │                                                                     │    │
│  │  Routes:                                                           │    │
│  │  /api/v1/jobs          → GET, POST (search, create)               │    │
│  │  /api/v1/jobs/{id}     → GET (details)                            │    │
│  │  /api/v1/users/me      → GET, PUT (profile)                       │    │
│  │  /api/v1/searches      → GET, POST, DELETE (saved searches)        │    │
│  │  /api/v1/auth/*        → Cognito endpoints                        │    │
│  │                                                                     │    │
│  │  Authorizers:                                                       │    │
│  │  - Cognito User Pool Authorizer (JWT validation)                  │    │
│  │  - API Key (for public job search, rate-limited)                   │    │
│  │                                                                     │    │
│  │  Throttling:                                                        │    │
│  │  - Default: 10,000 req/sec                                         │    │
│  │  - Per-key: 100 req/sec                                            │    │
│  └──────┬──────────────┬──────────────┬──────────────┬────────────────┘    │
│         │              │              │              │                       │
│         │              │              │              │                       │
└─────────┼──────────────┼──────────────┼──────────────┼───────────────────────┘
          │              │              │              │
          │              │              │              │
          ▼              ▼              ▼              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         LAMBDA FUNCTION LAYER                                │
│                                                                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐        │
│  │  JobSearchAPI    │  │  UserManagement   │  │  SearchService   │        │
│  │  Lambda          │  │  Lambda          │  │  Lambda          │        │
│  │                  │  │                  │  │                  │        │
│  │  Responsibilities:│  │  Responsibilities:│  │  Responsibilities:│        │
│  │  - Search jobs   │  │  - Get/update    │  │  - Save searches  │        │
│  │  - Filter jobs   │  │    user profile  │  │  - List searches  │        │
│  │  - Pagination    │  │  - User settings │  │  - Delete search  │        │
│  │  - Job details   │  │                  │  │  - Alert setup    │        │
│  │                  │  │  Memory: 512MB   │  │    (future)       │        │
│  │  Memory: 1024MB  │  │  Timeout: 10s    │  │                  │        │
│  │  Timeout: 15s    │  │  Reserved: 10    │  │  Memory: 512MB   │        │
│  │  Reserved: 50    │  │                  │  │  Timeout: 10s    │        │
│  │                  │  │                  │  │  Reserved: 10    │        │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘        │
│           │                      │                      │                   │
│           └──────────────────────┼──────────────────────┘                   │
│                                  │                                          │
│                                  ▼                                          │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │                    OpenSearch Query Service                        │    │
│  │  - Builds complex search queries                                   │    │
│  │  - Aggregations (location, salary ranges)                         │    │
│  │  - Highlights matching terms                                       │    │
│  └────────────────────────────┬───────────────────────────────────────┘    │
└───────────────────────────────┼─────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DATA STORAGE LAYER                                   │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │                      Amazon DynamoDB                                │    │
│  │                                                                     │    │
│  │  Tables:                                                           │    │
│  │  ┌────────────────────────────────────────────────────────────┐   │    │
│  │  │ jobs                                                        │   │    │
│  │  │ PK: provider_id#job_id                                      │   │    │
│  │  │ SK: posted_date                                             │   │    │
│  │  │ GSI1: location#remote (location, remote_flag)               │   │    │
│  │  │ GSI2: salary_range#posted_date (min_salary, max_salary)    │   │    │
│  │  │ TTL: expires_at (auto-delete expired jobs)                 │   │    │
│  │  └────────────────────────────────────────────────────────────┘   │    │
│  │                                                                     │    │
│  │  ┌────────────────────────────────────────────────────────────┐   │    │
│  │  │ users                                                      │   │    │
│  │  │ PK: user_id (Cognito sub)                                  │   │    │
│  │  │ Attributes: email, preferences, created_at                 │   │    │
│  │  └────────────────────────────────────────────────────────────┘   │    │
│  │                                                                     │    │
│  │  ┌────────────────────────────────────────────────────────────┐   │    │
│  │  │ saved_searches                                              │   │    │
│  │  │ PK: user_id                                                 │   │    │
│  │  │ SK: search_id (UUID)                                        │   │    │
│  │  │ Attributes: query_params, name, created_at, alert_enabled   │   │    │
│  │  └────────────────────────────────────────────────────────────┘   │    │
│  │                                                                     │    │
│  │  Features:                                                         │    │
│  │  - Point-in-time recovery (35 days)                               │    │
│  │  - Encryption at rest (KMS)                                       │    │
│  │  - On-demand capacity (auto-scaling)                               │   │    │
│  └────────────────────────────┬───────────────────────────────────────┘    │
│                                │                                             │
│  ┌─────────────────────────────▼───────────────────────────────────────┐   │
│  │                    Amazon OpenSearch                                │   │
│  │                                                                      │   │
│  │  Domain: job-search-domain                                          │   │
│  │  Instance: 2 × t3.small.search (dev), 3 × t3.medium.search (prod)  │   │
│  │  Multi-AZ: Yes                                                      │   │
│  │                                                                      │   │
│  │  Index: jobs                                                        │   │
│  │  Mappings:                                                          │   │
│  │    - title (text, analyzer: standard)                              │   │
│  │    - description (text, analyzer: standard)                         │   │
│  │    - company (keyword)                                              │   │
│  │    - location (keyword)                                             │   │
│  │    - remote (boolean)                                               │   │
│  │    - min_salary, max_salary (integer)                               │   │
│  │    - posted_date (date)                                             │   │
│  │    - provider_id (keyword)                                          │   │
│  │                                                                      │   │
│  │  Access: VPC endpoint (private) or public with fine-grained IAM    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                │
                                │ (sync via Lambda)
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      ASYNC PROCESSING LAYER                                  │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │                    Amazon EventBridge                               │    │
│  │                                                                     │    │
│  │  Rules:                                                            │    │
│  │  - job-sync-schedule: cron(0 */6 * * ? *) → SQS queue             │    │
│  │  - user-registered: user.signup → Lambda (welcome email)          │    │
│  │  - search-alert-trigger: custom → Lambda (alert processor)        │    │
│  └────────────────────────────┬───────────────────────────────────────┘    │
│                                │                                             │
│                                ▼                                             │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │                    Amazon SQS                                      │    │
│  │                                                                     │    │
│  │  Queues:                                                           │    │
│  │  - job-sync-queue (Standard)                                       │    │
│  │    Visibility timeout: 5 minutes                                   │    │
│  │    Message retention: 14 days                                      │    │
│  │                                                                     │    │
│  │  - job-sync-dlq (Dead Letter Queue)                                │    │
│  │    Max receives: 3                                                 │    │
│  │                                                                     │    │
│  │  Features:                                                         │    │
│  │  - Encryption at rest (KMS)                                         │    │
│  │  - Long polling (20s)                                               │    │
│  └────────────────────────────┬───────────────────────────────────────┘    │
│                                │                                             │
│                                ▼                                             │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │              JobSyncProcessor Lambda                                │    │
│  │                                                                     │    │
│  │  Responsibilities:                                                  │    │
│  │  - Polls SQS queue                                                 │    │
│  │  - Invokes provider adapters                                       │    │
│  │  - Transforms job data                                             │    │
│  │  - Writes to DynamoDB                                              │    │
│  │  - Updates OpenSearch index                                        │    │
│  │  - Handles retries and DLQ                                         │    │
│  │                                                                     │    │
│  │  Memory: 2048MB                                                     │    │
│  │  Timeout: 15 minutes                                                │    │
│  │  Reserved: 5                                                        │    │
│  │  Batch size: 10 messages                                            │    │
│  └────────────────────────────┬───────────────────────────────────────┘    │
│                                │                                             │
│                                ▼                                             │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │              Provider Adapter Lambdas                               │    │
│  │                                                                     │    │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐ │    │
│  │  │ LinkedInAdapter  │  │  MockAdapter     │  │  FutureProvider  │ │    │
│  │  │ Lambda           │  │  Lambda          │  │  Lambda          │ │    │
│  │  │                  │  │                  │  │                  │ │    │
│  │  │ - OAuth 2.0      │  │ - Test data      │  │ - Extensible     │ │    │
│  │  │ - API calls      │  │ - Local dev      │  │   pattern        │ │    │
│  │  │ - Rate limiting  │  │                  │  │                  │ │    │
│  │  │ - Error handling │  │                  │  │                  │ │    │
│  │  └──────────────────┘  └──────────────────┘  └──────────────────┘ │    │
│  │                                                                     │    │
│  │  Memory: 512MB                                                      │    │
│  │  Timeout: 5 minutes                                                 │    │
│  │  Reserved: 2                                                        │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                │
                                │ (external API calls)
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      EXTERNAL INTEGRATION LAYER                              │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │                    LinkedIn API                                    │    │
│  │  - Job Search API                                                  │    │
│  │  - OAuth 2.0 authentication                                        │    │
│  │  - Rate limits: 500 req/day (free tier)                            │    │
│  └────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                      SUPPORTING SERVICES                                     │
│                                                                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐        │
│  │ Amazon Cognito   │  │ Secrets Manager  │  │ AWS KMS          │        │
│  │                  │  │                  │  │                  │        │
│  │ User Pool:       │  │ Secrets:         │  │ Keys:            │        │
│  │ - Email signup   │  │ - linkedin_api   │  │ - DynamoDB       │        │
│  │ - OAuth providers│  │   _key           │  │ - SQS            │        │
│  │ - MFA optional   │  │ - linkedin_oauth │  │ - OpenSearch     │        │
│  │ - Password policy│  │   _secret        │  │ - Lambda env     │        │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘        │
│                                                                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐        │
│  │ CloudWatch Logs   │  │ CloudWatch       │  │ AWS X-Ray        │        │
│  │                   │  │ Metrics         │  │                  │        │
│  │ - Centralized     │  │ - Lambda        │  │ - Distributed    │        │
│  │   logging         │  │   invocations   │  │   tracing        │        │
│  │ - Log groups per  │  │ - Duration      │  │ - Service map    │        │
│  │   function        │  │ - Errors        │  │ - Performance    │        │
│  │ - Retention: 30d  │  │ - Throttles     │  │   analysis       │        │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Service Responsibilities

### 1. JobSearchAPI Lambda

**Purpose**: Handle job search and retrieval requests from the API Gateway.

**Responsibilities**:

- **GET /api/v1/jobs**: Search jobs with filters (location, salary, keywords, remote)
  - Validates query parameters
  - Builds OpenSearch query with filters
  - Paginates results (cursor-based)
  - Returns formatted job listings
- **GET /api/v1/jobs/{id}**: Retrieve single job details
  - Fetches from DynamoDB by composite key
  - Returns full job details
- **POST /api/v1/jobs**: Create job (admin-only, future feature)

**Input**: API Gateway event (query params, path params, Cognito user context)

**Output**: JSON response with job listings or job details

**Dependencies**:

- OpenSearch (read)
- DynamoDB (read)
- X-Ray (tracing)

**Error Handling**:

- Invalid query params → 400 Bad Request
- OpenSearch timeout → 504 Gateway Timeout
- Rate limit exceeded → 429 Too Many Requests

---

### 2. UserManagement Lambda

**Purpose**: Manage user profiles and preferences.

**Responsibilities**:

- **GET /api/v1/users/me**: Retrieve current user profile
  - Reads from DynamoDB `users` table
  - Returns user data (email, preferences, created_at)
- **PUT /api/v1/users/me**: Update user profile
  - Validates input
  - Updates DynamoDB
  - Returns updated profile

**Input**: API Gateway event (Cognito user ID from JWT)

**Output**: JSON user profile

**Dependencies**:

- DynamoDB (read/write)
- Cognito (user ID extraction)

**Error Handling**:

- User not found → 404 Not Found
- Invalid input → 400 Bad Request
- DynamoDB throttling → 503 Service Unavailable (retry)

---

### 3. SearchService Lambda

**Purpose**: Manage saved searches and future alert functionality.

**Responsibilities**:

- **GET /api/v1/searches**: List user's saved searches
  - Queries DynamoDB `saved_searches` table by user_id
  - Returns list of searches with metadata
- **POST /api/v1/searches**: Create saved search
  - Validates search parameters
  - Generates UUID for search_id
  - Stores in DynamoDB
  - Publishes EventBridge event (for future alert setup)
- **DELETE /api/v1/searches/{id}**: Delete saved search
  - Deletes from DynamoDB
  - Cancels any scheduled alerts (future)

**Input**: API Gateway event (user context, search parameters)

**Output**: JSON saved search object or list

**Dependencies**:

- DynamoDB (read/write/delete)
- EventBridge (publish events)

**Error Handling**:

- Invalid search params → 400 Bad Request
- Search not found → 404 Not Found
- Duplicate search → 409 Conflict

---

### 4. JobSyncProcessor Lambda

**Purpose**: Process job synchronization tasks from SQS queue.

**Responsibilities**:

- Polls SQS queue for sync messages
- Extracts provider and sync parameters from message
- Invokes appropriate provider adapter Lambda
- Receives job data from adapter
- Transforms job data to normalized format
- Batch writes to DynamoDB `jobs` table
- Updates OpenSearch index (via Lambda or direct API)
- Handles partial failures (some jobs succeed, some fail)
- Sends failed messages to DLQ after max retries

**Input**: SQS event (batch of messages)

**Output**: Success/failure status per message

**Dependencies**:

- SQS (receive, delete, send to DLQ)
- Provider adapter Lambdas (invoke)
- DynamoDB (batch write)
- OpenSearch (bulk index)
- EventBridge (publish sync completion events)

**Error Handling**:

- Provider adapter failure → Retry message (up to 3 times) → DLQ
- DynamoDB throttling → Exponential backoff retry
- OpenSearch failure → Log error, continue (jobs still in DynamoDB)
- Partial batch failure → Process successful items, retry failed ones

---

### 5. Provider Adapter Lambdas (LinkedInAdapter, MockAdapter, etc.)

**Purpose**: Abstract external job provider APIs behind a common interface.

**Responsibilities**:

- **LinkedInAdapter**:
  - Authenticates with LinkedIn OAuth 2.0 (token from Secrets Manager)
  - Calls LinkedIn Job Search API
  - Respects rate limits (500 req/day)
  - Transforms LinkedIn job format to normalized format
  - Handles API errors and retries
- **MockAdapter**:
  - Returns test job data for local development
  - No external API calls
  - Configurable via environment variables

**Input**: Lambda invocation event (provider name, sync parameters, pagination)

**Output**: Array of normalized job objects

**Dependencies**:

- Secrets Manager (API keys, OAuth tokens)
- External provider APIs (LinkedIn)

**Error Handling**:

- Invalid credentials → Return error (no retry)
- Rate limit exceeded → Return error with retry-after hint
- Network timeout → Retry with exponential backoff
- Invalid response format → Log error, return partial results

**Normalized Job Format**:

```json
{
  "job_id": "string",
  "provider_id": "linkedin",
  "title": "string",
  "description": "string",
  "company": "string",
  "location": "string",
  "remote": boolean,
  "min_salary": number,
  "max_salary": number,
  "posted_date": "ISO8601",
  "apply_url": "string",
  "expires_at": "ISO8601"
}
```

---

### 6. OpenSearch Query Service Lambda

**Purpose**: Build complex search queries for OpenSearch.

**Responsibilities**:

- Constructs OpenSearch query DSL from API parameters
- Applies filters (location, salary range, remote, date range)
- Handles full-text search with highlighting
- Performs aggregations (location buckets, salary ranges)
- Paginates results using search_after (cursor-based)
- Caches frequent queries (optional, via ElastiCache in future)

**Input**: Search parameters (query, filters, pagination cursor)

**Output**: OpenSearch query DSL JSON

**Dependencies**:

- OpenSearch (query execution)
- ElastiCache (optional, for caching)

**Error Handling**:

- Invalid query syntax → Return 400 Bad Request
- OpenSearch timeout → Return 504 Gateway Timeout
- Index not found → Return 503 Service Unavailable

---

## Data Flow

### Flow 1: User Searches for Jobs

```
1. User → CloudFront → API Gateway
   - Request: GET /api/v1/jobs?q=software&location=remote&min_salary=100000
   - Headers: Authorization: Bearer <JWT>

2. API Gateway → Cognito Authorizer
   - Validates JWT token
   - Extracts user_id from token claims
   - Returns IAM policy

3. API Gateway → JobSearchAPI Lambda
   - Event: { queryStringParameters, requestContext.authorizer.claims }

4. JobSearchAPI Lambda → OpenSearch Query Service Lambda
   - Invokes with search parameters
   - Receives OpenSearch query DSL

5. JobSearchAPI Lambda → OpenSearch
   - Executes query
   - Receives: { hits: [...], total: 150, scroll_id: "..." }

6. JobSearchAPI Lambda → DynamoDB (optional, for full details)
   - BatchGetItem for job details not in OpenSearch response
   - Only if OpenSearch response lacks required fields

7. JobSearchAPI Lambda → API Gateway
   - Response: { jobs: [...], total: 150, next_cursor: "..." }

8. API Gateway → CloudFront → User
   - JSON response with job listings
```

**Performance Targets**:

- P50 latency: < 200ms
- P95 latency: < 500ms
- P99 latency: < 1000ms

---

### Flow 2: Scheduled Job Sync

```
1. EventBridge Rule (cron: every 6 hours)
   - Triggers: job-sync-schedule rule
   - Target: SQS queue

2. EventBridge → SQS
   - Sends message: { provider: "linkedin", sync_type: "full", timestamp: "..." }

3. JobSyncProcessor Lambda (triggered by SQS)
   - Receives batch of messages (up to 10)
   - For each message:
     a. Extracts provider name
     b. Invokes provider adapter Lambda (async)
     c. Waits for response (or timeout)

4. Provider Adapter Lambda (LinkedInAdapter)
   - Reads OAuth token from Secrets Manager
   - Calls LinkedIn API (paginated)
   - Transforms jobs to normalized format
   - Returns array of jobs

5. JobSyncProcessor Lambda → DynamoDB
   - BatchWriteItem (up to 25 items per batch)
   - Handles conditional writes (skip duplicates)
   - Retries on throttling

6. JobSyncProcessor Lambda → OpenSearch
   - Bulk index operation
   - Updates or creates documents
   - Handles conflicts (versioning)

7. JobSyncProcessor Lambda → SQS
   - Deletes processed message
   - Sends to DLQ if max retries exceeded

8. JobSyncProcessor Lambda → EventBridge
   - Publishes: job-sync-completed event
   - Includes: provider, count, duration, status
```

**Performance Targets**:

- Sync duration: < 10 minutes for 10K jobs
- Throughput: 1000 jobs/minute
- Error rate: < 1%

---

### Flow 3: User Saves a Search

```
1. User → API Gateway
   - Request: POST /api/v1/searches
   - Body: { name: "Remote Software Jobs", query: {...}, alert_enabled: true }

2. API Gateway → SearchService Lambda
   - Validates input
   - Extracts user_id from JWT

3. SearchService Lambda → DynamoDB
   - PutItem to saved_searches table
   - PK: user_id, SK: UUID
   - Conditional write (prevent duplicates)

4. SearchService Lambda → EventBridge
   - Publishes: search-saved event
   - Payload: { user_id, search_id, alert_enabled }

5. SearchService Lambda → API Gateway
   - Response: { search_id: "...", created_at: "..." }

6. (Future) Alert Processor Lambda (triggered by EventBridge)
   - Sets up scheduled alert (EventBridge rule)
   - Queries jobs matching search criteria
   - Sends notification (SES/SNS)
```

---

## Failure Modes & Resilience

### 1. API Gateway Failures

**Failure Mode**: API Gateway throttling or service degradation

**Impact**: Users cannot search jobs or access API

**Mitigation**:

- **Throttling**: Configure per-key limits (100 req/sec), burst limits
- **Retry Logic**: Client-side exponential backoff
- **Circuit Breaker**: Client-side circuit breaker pattern
- **Monitoring**: CloudWatch alarms on 429 responses
- **Scaling**: API Gateway auto-scales (10K req/sec default)

**Recovery**:

- Automatic (API Gateway is highly available)
- If persistent: Contact AWS support, check WAF rules

---

### 2. Lambda Function Failures

**Failure Mode**: Lambda timeout, out of memory, or unhandled exception

**Impact**: Request fails, user sees 500 error

**Mitigation**:

- **Timeout**: Set appropriate timeouts (15s for API, 15min for sync)
- **Memory**: Right-size memory (affects CPU allocation)
- **Reserved Concurrency**: Prevent one function from consuming all capacity
- **Error Handling**: Try-catch blocks, return proper error responses
- **Dead Letter Queues**: For async invocations (EventBridge, SQS)
- **X-Ray**: Trace errors to identify root cause

**Recovery**:

- Automatic retry (for async invocations)
- Manual: Fix code, deploy new version
- Rollback: Use Lambda versions/aliases for instant rollback

**Example Error Handling**:

```typescript
try {
  const jobs = await searchOpenSearch(query);
  return { statusCode: 200, body: JSON.stringify(jobs) };
} catch (error) {
  if (error.name === 'ResourceNotFoundException') {
    return { statusCode: 503, body: JSON.stringify({ error: 'Search index unavailable' }) };
  }
  console.error('Search error:', error);
  return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) };
}
```

---

### 3. DynamoDB Failures

**Failure Mode**: Throttling (provisioned capacity exceeded) or service degradation

**Impact**: Writes/reads fail, sync jobs fail, user operations fail

**Mitigation**:

- **Capacity Mode**: Use on-demand (auto-scaling) for unpredictable traffic
- **Retry Logic**: Exponential backoff with jitter (AWS SDK built-in)
- **Batch Operations**: Use BatchGetItem/BatchWriteItem (reduces requests)
- **Error Handling**: Handle ProvisionedThroughputExceededException
- **Monitoring**: CloudWatch metrics (ConsumedReadCapacityUnits, ThrottledRequests)

**Recovery**:

- Automatic (on-demand mode scales automatically)
- If throttling persists: Switch to on-demand, or increase provisioned capacity
- **Point-in-time Recovery**: Restore table to any point in last 35 days

**Example Retry Logic**:

```typescript
const result = await dynamodb
  .putItem(params)
  .promise()
  .catch(async (error) => {
    if (error.code === 'ProvisionedThroughputExceededException') {
      await sleep(Math.random() * 1000); // Jitter
      return dynamodb.putItem(params).promise(); // Retry
    }
    throw error;
  });
```

---

### 4. OpenSearch Failures

**Failure Mode**: Cluster health degradation, node failure, or index corruption

**Impact**: Search queries fail or return incomplete results

**Mitigation**:

- **Multi-AZ**: Deploy OpenSearch across 2+ AZs (automatic failover)
- **Node Count**: Minimum 2 nodes (data nodes) for redundancy
- **Health Monitoring**: CloudWatch alarms on cluster health (red/yellow)
- **Backup**: Automated snapshots (daily) to S3
- **Fallback**: Query DynamoDB directly if OpenSearch unavailable (slower)
- **Circuit Breaker**: Stop querying OpenSearch if health is red

**Recovery**:

- **Node Failure**: Automatic replacement (if multi-AZ)
- **Index Corruption**: Restore from snapshot
- **Cluster Red**: Manual intervention (AWS support), restore from snapshot

**Fallback Strategy**:

```typescript
async function searchJobs(query) {
  try {
    return await openSearchClient.search(query);
  } catch (error) {
    if (error.statusCode === 503 || clusterHealth === 'red') {
      console.warn('OpenSearch unavailable, falling back to DynamoDB');
      return await searchDynamoDB(query); // Slower but works
    }
    throw error;
  }
}
```

---

### 5. SQS Queue Failures

**Failure Mode**: Message processing failures, DLQ overflow, or queue deletion

**Impact**: Job syncs fail, jobs become stale

**Mitigation**:

- **Visibility Timeout**: Set to 5 minutes (longer than Lambda timeout)
- **Dead Letter Queue**: Configure max receives (3), monitor DLQ depth
- **Batch Processing**: Process messages in batches (reduce partial failures)
- **Idempotency**: Make sync operations idempotent (handle duplicate messages)
- **Monitoring**: CloudWatch alarms on DLQ depth, message age

**Recovery**:

- **DLQ Messages**: Investigate failures, fix code, replay messages
- **Queue Deletion**: Restore from backup (if enabled), or recreate queue

**Idempotency Example**:

```typescript
// Use job_id as idempotency key
await dynamodb.putItem({
  Item: { ...job, job_id },
  ConditionExpression: 'attribute_not_exists(job_id)', // Skip if exists
});
```

---

### 6. External Provider API Failures (LinkedIn)

**Failure Mode**: API downtime, rate limiting, or authentication failures

**Impact**: Job syncs fail, jobs become stale

**Mitigation**:

- **Retry Logic**: Exponential backoff (respect Retry-After header)
- **Rate Limiting**: Track API calls, implement client-side rate limiting
- **Circuit Breaker**: Stop calling API if failure rate > threshold
- **Fallback**: Use cached data, or skip sync (next sync will catch up)
- **Monitoring**: Track API success rate, latency, error codes

**Recovery**:

- **Rate Limit**: Wait for reset (daily limit), or upgrade API tier
- **Auth Failure**: Refresh OAuth token, update Secrets Manager
- **API Downtime**: Wait for provider to recover, sync will resume on next schedule

**Circuit Breaker Example**:

```typescript
class LinkedInAdapter {
  private failureCount = 0;
  private circuitOpen = false;

  async fetchJobs() {
    if (this.circuitOpen) {
      throw new Error('Circuit breaker open');
    }
    try {
      const jobs = await this.callLinkedInAPI();
      this.failureCount = 0;
      return jobs;
    } catch (error) {
      this.failureCount++;
      if (this.failureCount > 5) {
        this.circuitOpen = true;
        setTimeout(() => {
          this.circuitOpen = false;
        }, 60000); // 1 min
      }
      throw error;
    }
  }
}
```

---

### 7. Secrets Manager Failures

**Failure Mode**: Secret rotation failure, access denied, or secret deletion

**Impact**: Provider adapters cannot authenticate, syncs fail

**Mitigation**:

- **IAM Permissions**: Least-privilege access (only required secrets)
- **Caching**: Cache secrets in Lambda memory (reduce API calls)
- **Rotation**: Enable automatic rotation (if supported)
- **Monitoring**: CloudWatch alarms on GetSecretValue failures
- **Fallback**: Use environment variables (less secure, for dev only)

**Recovery**:

- **Access Denied**: Fix IAM policy, redeploy Lambda
- **Secret Deleted**: Restore from backup, or recreate secret
- **Rotation Failure**: Manual rotation, update Lambda to use new secret

---

### 8. Network Failures

**Failure Mode**: VPC endpoint failures, NAT Gateway issues, or DNS failures

**Impact**: Lambda cannot reach DynamoDB/OpenSearch (if in VPC), or external APIs

**Mitigation**:

- **VPC Endpoints**: Use VPC endpoints for DynamoDB/OpenSearch (private, no NAT)
- **Multi-AZ**: Deploy endpoints in multiple AZs
- **DNS**: Use Route 53 for reliable DNS resolution
- **Timeout**: Set appropriate timeouts, retry with backoff
- **Monitoring**: CloudWatch VPC Flow Logs, endpoint health

**Recovery**:

- **Endpoint Failure**: Automatic failover (if multi-AZ)
- **NAT Failure**: Replace NAT Gateway, or use VPC endpoints (no NAT needed)

---

## Disaster Recovery Strategy

### Backup Strategy

1. **DynamoDB**:
   - Point-in-time recovery (35 days)
   - On-demand backups (before major changes)
   - Cross-region replication (optional, for multi-region)

2. **OpenSearch**:
   - Automated snapshots to S3 (daily)
   - Manual snapshots (before cluster changes)
   - Cross-region snapshot copy (optional)

3. **Secrets Manager**:
   - Automatic versioning (keep last 100 versions)
   - Manual backup to secure storage (for critical secrets)

4. **Lambda Code**:
   - Versioned deployments (keep last 10 versions)
   - Source code in Git (GitHub)
   - CDK infrastructure in Git

### Recovery Procedures

**RTO (Recovery Time Objective)**: 4 hours
**RPO (Recovery Point Objective)**: 1 hour (last sync)

**Scenario 1: Single Region Failure**

- **Action**: Failover to secondary region (if configured)
- **Steps**:
  1. Update Route 53 DNS to point to secondary region
  2. Restore DynamoDB from backup (or use global tables)
  3. Restore OpenSearch from snapshot
  4. Redeploy Lambda functions (from Git)
  5. Verify functionality

**Scenario 2: Data Corruption**

- **Action**: Restore from point-in-time backup
- **Steps**:
  1. Identify corruption timestamp
  2. Restore DynamoDB table to point before corruption
  3. Restore OpenSearch index from snapshot
  4. Re-sync jobs from providers (if needed)

**Scenario 3: Accidental Deletion**

- **Action**: Restore from backup or recreate
- **Steps**:
  1. Restore DynamoDB table (point-in-time recovery)
  2. Restore OpenSearch domain (from snapshot)
  3. Redeploy Lambda functions (from Git/CDK)
  4. Verify all services are operational

---

## Monitoring & Observability

### Key Metrics

**API Metrics**:

- Request count (per endpoint)
- Latency (P50, P95, P99)
- Error rate (4xx, 5xx)
- Throttle count (429)

**Lambda Metrics**:

- Invocations
- Duration
- Errors
- Throttles
- Concurrent executions

**DynamoDB Metrics**:

- Consumed read/write capacity
- Throttled requests
- User errors

**OpenSearch Metrics**:

- Cluster health (green/yellow/red)
- Search latency
- Indexing rate
- JVM memory pressure

**SQS Metrics**:

- Messages sent/received
- Messages in flight
- DLQ depth
- Message age

### CloudWatch Alarms

1. **High Error Rate**: Error rate > 5% for 5 minutes → SNS alert
2. **High Latency**: P95 latency > 1s for 5 minutes → SNS alert
3. **DLQ Depth**: DLQ messages > 10 → SNS alert
4. **OpenSearch Health**: Cluster health = red → SNS alert
5. **DynamoDB Throttling**: Throttled requests > 100/min → SNS alert

### Logging Strategy

- **Centralized Logging**: All Lambda logs → CloudWatch Logs
- **Structured Logging**: JSON format with correlation IDs
- **Log Retention**: 30 days (configurable)
- **Log Levels**: ERROR, WARN, INFO, DEBUG (per environment)

### Tracing Strategy

- **X-Ray**: Enable for all Lambda functions
- **Service Map**: Visualize service dependencies
- **Trace Sampling**: 100% for errors, 10% for successful requests
- **Custom Annotations**: Add business context (user_id, search_query)

---

## Security Considerations

### Authentication & Authorization

- **Cognito**: User authentication (email/password, OAuth)
- **API Gateway**: JWT validation via Cognito authorizer
- **IAM Roles**: Least-privilege per Lambda function
- **API Keys**: For public endpoints (rate-limited)

### Data Protection

- **Encryption at Rest**:
  - DynamoDB: KMS encryption
  - OpenSearch: KMS encryption
  - SQS: KMS encryption
  - Secrets Manager: KMS encryption
- **Encryption in Transit**: TLS 1.2+ for all API calls
- **Secrets**: Never log secrets, use Secrets Manager

### Network Security

- **VPC Endpoints**: Private access to DynamoDB/OpenSearch (optional)
- **Security Groups**: Restrict Lambda network access (if in VPC)
- **WAF**: DDoS protection, rate limiting, SQL injection protection

### Compliance

- **Audit Logging**: CloudTrail for all API calls
- **Data Retention**: Per GDPR requirements (user data deletion)
- **Access Control**: IAM policies, MFA for admin access

---

## Cost Optimization

### Strategies

1. **Lambda**: Right-size memory, use provisioned concurrency only if needed
2. **DynamoDB**: Use on-demand for variable traffic, provisioned for predictable
3. **OpenSearch**: Use t3 instances (burstable), scale down in dev
4. **API Gateway**: Cache responses where possible
5. **SQS**: Use standard queue (not FIFO) unless ordering required
6. **CloudWatch**: Set log retention, avoid excessive custom metrics

### Estimated Monthly Costs (Production)

- API Gateway: $3.50 (1M requests)
- Lambda: $20 (compute)
- DynamoDB: $25 (on-demand)
- OpenSearch: $60 (2 × t3.small.search)
- SQS/EventBridge: $2
- CloudWatch: $10
- **Total**: ~$120/month

---

## Next Steps

1. **Review and approve** this architecture design
2. **Create CDK project structure** (libs per service)
3. **Define data models** (DynamoDB schemas, OpenSearch mappings)
4. **Implement Phase 1**: Core API + Authentication
5. **Set up CI/CD pipeline** (GitHub Actions)
6. **Configure monitoring** (CloudWatch alarms, X-Ray)
