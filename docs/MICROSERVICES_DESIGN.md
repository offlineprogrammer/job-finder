# Microservices Decomposition: Job Finder Platform

## Overview

This document decomposes the Job Finder Platform into independent, domain-driven microservices. Each service is:
- **Independently deployable** (via separate Lambda functions/CDK stacks)
- **Loosely coupled** (communicates via APIs and events)
- **Highly cohesive** (single responsibility per service)
- **Scalable** (scales independently based on load)

---

## Service Boundaries & Communication Patterns

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         API Gateway (REST)                               │
│                    Routes requests to services                            │
└───┬──────────┬──────────┬──────────┬──────────┬──────────┬──────────────┘
    │          │          │          │          │          │
    ▼          ▼          ▼          ▼          ▼          ▼
┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
│  Job    │ │  User   │ │ Search  │ │  Sync   │ │Provider │ │Notif.   │
│ Search  │ │ Service │ │ Service │ │ Service │ │ Service │ │ Service │
│ Service │ │         │ │         │ │         │ │         │ │(Future) │
└────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘
     │           │           │           │           │           │
     │           │           │           │           │           │
     └───────────┴───────────┴───────────┴───────────┴───────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │   EventBridge        │
         │   (Event Bus)        │
         └──────────────────────┘
```

**Communication Patterns**:
- **Synchronous**: REST APIs via API Gateway (request/response)
- **Asynchronous**: EventBridge events (fire-and-forget, eventual consistency)
- **Queue-based**: SQS for job processing (reliable async)

---

## Microservice 1: Job Search Service

### Domain
**Job Discovery & Retrieval**

### Responsibilities
- Search jobs by keywords, filters (location, salary, remote, date range)
- Retrieve individual job details
- Provide job aggregations (location counts, salary ranges)
- Handle pagination and result ranking
- Cache frequent search queries (optional)

### APIs

#### REST Endpoints (via API Gateway)

**GET /api/v1/jobs**
- **Purpose**: Search jobs with filters
- **Query Parameters**:
  - `q` (string, optional): Search query (keywords)
  - `location` (string, optional): Location filter (e.g., "San Francisco, CA")
  - `remote` (boolean, optional): Remote-only filter
  - `min_salary` (number, optional): Minimum salary filter
  - `max_salary` (number, optional): Maximum salary filter
  - `provider` (string, optional): Filter by provider (e.g., "linkedin")
  - `posted_after` (ISO8601, optional): Jobs posted after date
  - `limit` (number, default: 20): Results per page
  - `cursor` (string, optional): Pagination cursor
- **Response**: 
  ```json
  {
    "jobs": [
      {
        "job_id": "linkedin#12345",
        "title": "Senior Software Engineer",
        "company": "Tech Corp",
        "location": "San Francisco, CA",
        "remote": true,
        "min_salary": 150000,
        "max_salary": 200000,
        "posted_date": "2026-02-09T10:00:00Z",
        "apply_url": "https://...",
        "description": "..."
      }
    ],
    "total": 150,
    "next_cursor": "eyJqb2JfaWQiOiIuLi4ifQ=="
  }
  ```
- **Auth**: Public (API key) or Authenticated (Cognito JWT)
- **Rate Limit**: 100 req/min (public), 1000 req/min (authenticated)

**GET /api/v1/jobs/{job_id}**
- **Purpose**: Get detailed job information
- **Path Parameters**: `job_id` (string): Composite ID (provider#job_id)
- **Response**: Full job object with extended details
- **Auth**: Public (API key) or Authenticated
- **Rate Limit**: 200 req/min

**GET /api/v1/jobs/aggregations**
- **Purpose**: Get job statistics (location counts, salary ranges)
- **Query Parameters**: Same filters as search endpoint
- **Response**:
  ```json
  {
    "locations": [
      { "location": "San Francisco, CA", "count": 45 },
      { "location": "Remote", "count": 120 }
    ],
    "salary_ranges": [
      { "range": "100k-150k", "count": 30 },
      { "range": "150k-200k", "count": 50 }
    ]
  }
  ```
- **Auth**: Public (API key)
- **Rate Limit**: 50 req/min

### Data Stores

**Primary: Amazon OpenSearch**
- **Index**: `jobs`
- **Purpose**: Full-text search, filtering, aggregations
- **Data Model**:
  ```json
  {
    "job_id": "linkedin#12345",
    "provider_id": "linkedin",
    "title": "Senior Software Engineer",
    "description": "Full job description...",
    "company": "Tech Corp",
    "location": "San Francisco, CA",
    "remote": true,
    "min_salary": 150000,
    "max_salary": 200000,
    "posted_date": "2026-02-09T10:00:00Z",
    "expires_at": "2026-05-09T10:00:00Z",
    "apply_url": "https://...",
    "tags": ["javascript", "react", "nodejs"]
  }
  ```
- **Access Pattern**: Read-heavy (searches), write via sync service
- **Replication**: Multi-AZ (2+ nodes)

**Secondary: Amazon DynamoDB**
- **Table**: `jobs` (read for full details not in OpenSearch)
- **Purpose**: Source of truth, full job details
- **Access Pattern**: Read by job_id (composite key)
- **Consistency**: Eventually consistent with OpenSearch

**Optional: Amazon ElastiCache (Redis)**
- **Purpose**: Cache frequent search queries
- **TTL**: 5 minutes
- **Key Pattern**: `search:{hash_of_query_params}`

### Scaling Characteristics

**Compute (Lambda)**:
- **Function**: `JobSearchAPI`
- **Memory**: 1024 MB (affects CPU allocation)
- **Timeout**: 15 seconds
- **Reserved Concurrency**: 50 (prevents one function from consuming all capacity)
- **Auto-scaling**: 0 to 1000+ concurrent executions
- **Scaling Trigger**: API Gateway request rate
- **Cold Start Mitigation**: Provisioned concurrency (10-20 warm instances)

**OpenSearch**:
- **Scaling**: Horizontal (add nodes) or vertical (upgrade instance type)
- **Auto-scaling**: Manual (CloudWatch alarms trigger scaling)
- **Burst Capacity**: t3 instances support burst credits
- **Scaling Threshold**: 
  - CPU > 70% for 5 minutes → scale up
  - CPU < 30% for 15 minutes → scale down

**DynamoDB**:
- **Capacity Mode**: On-demand (auto-scales)
- **Scaling**: Automatic, no manual intervention
- **Read Capacity**: Scales based on traffic

**Performance Targets**:
- P50 latency: < 200ms
- P95 latency: < 500ms
- P99 latency: < 1000ms
- Throughput: 1000 searches/second

### Dependencies
- **OpenSearch**: Read queries
- **DynamoDB**: Read job details (fallback)
- **EventBridge**: Publishes `job.viewed` events (analytics)
- **X-Ray**: Distributed tracing

### Events Published
- `job.viewed` (when user views job details)
- `job.search.performed` (analytics, anonymized)

---

## Microservice 2: User Service

### Domain
**User Identity & Profile Management**

### Responsibilities
- Retrieve user profile information
- Update user profile and preferences
- Manage user settings (email notifications, privacy)
- Validate user authentication context (JWT)
- Handle user registration events (from Cognito)

### APIs

#### REST Endpoints (via API Gateway)

**GET /api/v1/users/me**
- **Purpose**: Get current user's profile
- **Headers**: `Authorization: Bearer <JWT>`
- **Response**:
  ```json
  {
    "user_id": "us-east-1:abc123",
    "email": "user@example.com",
    "preferences": {
      "email_notifications": true,
      "default_location": "San Francisco, CA",
      "default_salary_range": { "min": 100000, "max": 200000 }
    },
    "created_at": "2026-01-01T00:00:00Z",
    "updated_at": "2026-02-09T10:00:00Z"
  }
  ```
- **Auth**: Required (Cognito JWT)
- **Rate Limit**: 100 req/min per user

**PUT /api/v1/users/me**
- **Purpose**: Update user profile
- **Headers**: `Authorization: Bearer <JWT>`
- **Request Body**:
  ```json
  {
    "preferences": {
      "email_notifications": false,
      "default_location": "Remote",
      "default_salary_range": { "min": 120000, "max": 180000 }
    }
  }
  ```
- **Response**: Updated user profile
- **Auth**: Required (Cognito JWT)
- **Rate Limit**: 50 req/min per user

**GET /api/v1/users/{user_id}**
- **Purpose**: Get user profile (admin or self only)
- **Path Parameters**: `user_id` (string)
- **Response**: User profile (limited fields for privacy)
- **Auth**: Required (Cognito JWT, same user or admin)
- **Rate Limit**: 100 req/min

### Data Stores

**Primary: Amazon DynamoDB**
- **Table**: `users`
- **Partition Key**: `user_id` (Cognito sub)
- **Attributes**:
  - `email` (string)
  - `preferences` (map)
  - `created_at` (string, ISO8601)
  - `updated_at` (string, ISO8601)
  - `last_login_at` (string, ISO8601)
- **GSI**: None (single partition key access)
- **Access Pattern**: Read/write by user_id
- **Consistency**: Strong consistency (single item reads)

**Secondary: Amazon Cognito**
- **User Pool**: Stores authentication data (email, password, MFA)
- **Purpose**: Authentication only (not profile data)
- **Integration**: Lambda reads user_id from JWT claims

### Scaling Characteristics

**Compute (Lambda)**:
- **Function**: `UserManagement`
- **Memory**: 512 MB
- **Timeout**: 10 seconds
- **Reserved Concurrency**: 10
- **Auto-scaling**: 0 to 100+ concurrent executions
- **Scaling Trigger**: API Gateway request rate
- **Cold Start**: < 100ms (small function)

**DynamoDB**:
- **Capacity Mode**: On-demand
- **Scaling**: Automatic
- **Read/Write Capacity**: Scales based on traffic
- **Performance**: Single-digit millisecond latency

**Performance Targets**:
- P50 latency: < 50ms
- P95 latency: < 200ms
- P99 latency: < 500ms
- Throughput: 500 requests/second

### Dependencies
- **DynamoDB**: Read/write user data
- **Cognito**: Validate JWT (via API Gateway authorizer)
- **EventBridge**: Publishes `user.profile.updated` events
- **X-Ray**: Distributed tracing

### Events Published
- `user.profile.updated` (when user updates profile)
- `user.registered` (triggered by Cognito post-confirmation hook)

### Events Consumed
- `user.registered` (from Cognito, creates user profile)

---

## Microservice 3: Search Management Service

### Domain
**Saved Searches & Alert Management**

### Responsibilities
- Create, read, update, delete saved searches
- Manage search alert preferences
- Trigger search alerts (future: when new jobs match criteria)
- Validate search parameters
- Track search usage (analytics)

### APIs

#### REST Endpoints (via API Gateway)

**GET /api/v1/searches**
- **Purpose**: List user's saved searches
- **Headers**: `Authorization: Bearer <JWT>`
- **Query Parameters**:
  - `limit` (number, default: 20): Results per page
  - `cursor` (string, optional): Pagination cursor
- **Response**:
  ```json
  {
    "searches": [
      {
        "search_id": "uuid-1234",
        "name": "Remote Software Jobs",
        "query_params": {
          "q": "software engineer",
          "remote": true,
          "min_salary": 100000
        },
        "alert_enabled": true,
        "created_at": "2026-01-15T00:00:00Z",
        "last_alert_at": "2026-02-08T10:00:00Z"
      }
    ],
    "next_cursor": "..."
  }
  ```
- **Auth**: Required (Cognito JWT)
- **Rate Limit**: 100 req/min per user

**POST /api/v1/searches**
- **Purpose**: Create a new saved search
- **Headers**: `Authorization: Bearer <JWT>`
- **Request Body**:
  ```json
  {
    "name": "Remote Software Jobs",
    "query_params": {
      "q": "software engineer",
      "remote": true,
      "min_salary": 100000
    },
    "alert_enabled": true
  }
  ```
- **Response**: Created search object with `search_id`
- **Auth**: Required (Cognito JWT)
- **Rate Limit**: 20 req/min per user

**GET /api/v1/searches/{search_id}**
- **Purpose**: Get saved search details
- **Path Parameters**: `search_id` (UUID)
- **Response**: Single search object
- **Auth**: Required (Cognito JWT, same user)
- **Rate Limit**: 100 req/min

**PUT /api/v1/searches/{search_id}**
- **Purpose**: Update saved search
- **Path Parameters**: `search_id` (UUID)
- **Request Body**: Partial update (name, query_params, alert_enabled)
- **Response**: Updated search object
- **Auth**: Required (Cognito JWT, same user)
- **Rate Limit**: 50 req/min per user

**DELETE /api/v1/searches/{search_id}**
- **Purpose**: Delete saved search
- **Path Parameters**: `search_id` (UUID)
- **Response**: 204 No Content
- **Auth**: Required (Cognito JWT, same user)
- **Rate Limit**: 50 req/min per user

### Data Stores

**Primary: Amazon DynamoDB**
- **Table**: `saved_searches`
- **Partition Key**: `user_id` (Cognito sub)
- **Sort Key**: `search_id` (UUID)
- **Attributes**:
  - `name` (string)
  - `query_params` (map): Search parameters
  - `alert_enabled` (boolean)
  - `created_at` (string, ISO8601)
  - `updated_at` (string, ISO8601)
  - `last_alert_at` (string, ISO8601, optional)
- **GSI**: None (query by user_id)
- **Access Pattern**: 
  - Query by user_id (list searches)
  - Get by user_id + search_id
- **Consistency**: Strong consistency

**Secondary: Amazon EventBridge**
- **Rules**: Scheduled rules for alert triggers (future)
- **Purpose**: Trigger alert processing
- **Pattern**: `{ "source": ["job-finder"], "detail-type": ["search-alert-trigger"] }`

### Scaling Characteristics

**Compute (Lambda)**:
- **Function**: `SearchService`
- **Memory**: 512 MB
- **Timeout**: 10 seconds
- **Reserved Concurrency**: 10
- **Auto-scaling**: 0 to 100+ concurrent executions
- **Scaling Trigger**: API Gateway request rate
- **Cold Start**: < 100ms

**DynamoDB**:
- **Capacity Mode**: On-demand
- **Scaling**: Automatic
- **Performance**: Single-digit millisecond latency

**Performance Targets**:
- P50 latency: < 50ms
- P95 latency: < 200ms
- P99 latency: < 500ms
- Throughput: 200 requests/second

### Dependencies
- **DynamoDB**: Read/write saved searches
- **EventBridge**: Publish events (search created/updated/deleted)
- **Job Search Service**: Validate search parameters (future: via internal API)
- **X-Ray**: Distributed tracing

### Events Published
- `search.saved` (when user creates saved search)
- `search.updated` (when user updates saved search)
- `search.deleted` (when user deletes saved search)
- `search.alert.enabled` (when alert is enabled)

### Events Consumed
- `job.sync.completed` (future: trigger alert checks)

---

## Microservice 4: Job Sync Service

### Domain
**Job Data Synchronization & Ingestion**

### Responsibilities
- Poll external job providers (LinkedIn, etc.) for new/updated jobs
- Transform provider-specific job data to normalized format
- Store jobs in DynamoDB (source of truth)
- Index jobs in OpenSearch (for search)
- Handle sync failures and retries
- Track sync metrics (success rate, job counts)

### APIs

#### Internal APIs (Lambda-to-Lambda)

**Invoke Sync Job**
- **Purpose**: Trigger job sync for a provider
- **Invocation**: Direct Lambda invocation or SQS message
- **Payload**:
  ```json
  {
    "provider": "linkedin",
    "sync_type": "full|incremental",
    "since": "2026-02-08T00:00:00Z" // for incremental
  }
  ```
- **Response**: Sync status and job count

**Get Sync Status**
- **Purpose**: Check sync status for a provider
- **Invocation**: Direct Lambda invocation
- **Response**:
  ```json
  {
    "provider": "linkedin",
    "status": "in_progress|completed|failed",
    "jobs_synced": 150,
    "started_at": "2026-02-09T10:00:00Z",
    "completed_at": "2026-02-09T10:15:00Z",
    "error": null
  }
  ```

### Data Stores

**Primary: Amazon DynamoDB**
- **Table**: `jobs`
- **Partition Key**: `provider_id#job_id` (composite)
- **Sort Key**: `posted_date` (ISO8601)
- **Attributes**: Full job object (see Job Search Service)
- **GSIs**:
  - `GSI1`: `location#remote` (for filtering)
  - `GSI2`: `salary_range#posted_date` (for salary filtering)
- **TTL**: `expires_at` (auto-delete expired jobs)
- **Access Pattern**: Batch writes (25 items per batch)
- **Consistency**: Eventually consistent (batch writes)

**Secondary: Amazon OpenSearch**
- **Index**: `jobs` (synced from DynamoDB)
- **Purpose**: Search index (updated after DynamoDB write)
- **Sync Method**: Lambda writes directly to OpenSearch after DynamoDB
- **Bulk Operations**: Batch index updates (100-1000 jobs per batch)

**Metadata: Amazon DynamoDB**
- **Table**: `sync_metadata`
- **Partition Key**: `provider_id`
- **Attributes**:
  - `last_sync_at` (ISO8601)
  - `last_sync_status` (string)
  - `jobs_synced_count` (number)
  - `next_sync_at` (ISO8601)
- **Purpose**: Track sync state per provider

### Scaling Characteristics

**Compute (Lambda)**:
- **Function**: `JobSyncProcessor`
- **Memory**: 2048 MB (for batch processing)
- **Timeout**: 15 minutes (max Lambda timeout)
- **Reserved Concurrency**: 5 (prevent overloading providers)
- **Auto-scaling**: 0 to 10 concurrent executions
- **Scaling Trigger**: SQS queue depth
- **Batch Size**: 10 messages per invocation (SQS)

**SQS Queue**:
- **Queue**: `job-sync-queue` (Standard)
- **Visibility Timeout**: 5 minutes
- **Message Retention**: 14 days
- **Scaling**: Automatic (unlimited throughput)
- **DLQ**: `job-sync-dlq` (max receives: 3)

**DynamoDB**:
- **Capacity Mode**: On-demand
- **Scaling**: Automatic
- **Write Capacity**: Handles batch writes (25 items/batch)

**OpenSearch**:
- **Indexing Rate**: 1000-5000 jobs/minute (depends on instance size)
- **Bulk API**: 100-1000 jobs per bulk request

**Performance Targets**:
- Sync Duration: < 10 minutes for 10K jobs
- Throughput: 1000 jobs/minute
- Error Rate: < 1%
- Retry Success Rate: > 90%

### Dependencies
- **SQS**: Receive sync messages
- **Provider Integration Service**: Invoke provider adapters
- **DynamoDB**: Write jobs
- **OpenSearch**: Index jobs
- **EventBridge**: Publish sync completion events
- **Secrets Manager**: Provider API keys
- **X-Ray**: Distributed tracing

### Events Published
- `job.sync.started` (when sync begins)
- `job.sync.completed` (when sync finishes successfully)
- `job.sync.failed` (when sync fails)
- `jobs.indexed` (when jobs are indexed in OpenSearch)

### Events Consumed
- `job.sync.scheduled` (from EventBridge cron rule)

---

## Microservice 5: Provider Integration Service

### Domain
**External Provider Abstraction & Integration**

### Responsibilities
- Abstract external job provider APIs behind common interface
- Handle provider-specific authentication (OAuth 2.0, API keys)
- Implement provider-specific rate limiting
- Transform provider data to normalized format
- Handle provider API errors and retries
- Support multiple providers (LinkedIn, future: Indeed, etc.)

### APIs

#### Internal APIs (Lambda-to-Lambda)

**Fetch Jobs**
- **Purpose**: Fetch jobs from a provider
- **Invocation**: Direct Lambda invocation (from Job Sync Service)
- **Payload**:
  ```json
  {
    "provider": "linkedin",
    "params": {
      "keywords": "software engineer",
      "location": "San Francisco",
      "since": "2026-02-08T00:00:00Z"
    },
    "pagination": {
      "page": 1,
      "per_page": 100
    }
  }
  ```
- **Response**:
  ```json
  {
    "jobs": [
      {
        "job_id": "12345",
        "title": "Senior Software Engineer",
        "company": "Tech Corp",
        "location": "San Francisco, CA",
        "remote": true,
        "min_salary": 150000,
        "max_salary": 200000,
        "posted_date": "2026-02-09T10:00:00Z",
        "apply_url": "https://...",
        "description": "..."
      }
    ],
    "pagination": {
      "page": 1,
      "per_page": 100,
      "total": 500,
      "has_more": true
    }
  }
  ```

**Get Provider Status**
- **Purpose**: Check provider API status and rate limits
- **Invocation**: Direct Lambda invocation
- **Response**:
  ```json
  {
    "provider": "linkedin",
    "status": "healthy|degraded|down",
    "rate_limit": {
      "remaining": 450,
      "reset_at": "2026-02-10T00:00:00Z"
    },
    "last_check": "2026-02-09T10:00:00Z"
  }
  ```

### Provider Adapters

**LinkedIn Adapter** (`LinkedInAdapter` Lambda):
- **Authentication**: OAuth 2.0 (client credentials flow)
- **API**: LinkedIn Job Search API
- **Rate Limits**: 500 requests/day (free tier)
- **Pagination**: Cursor-based
- **Error Handling**: Retry with exponential backoff, respect Retry-After header

**Mock Adapter** (`MockAdapter` Lambda):
- **Purpose**: Local development and testing
- **Data Source**: Static JSON or DynamoDB test data
- **No External Calls**: Returns test data immediately

**Future Adapters**:
- Indeed API adapter
- Glassdoor API adapter
- Custom provider adapters (extensible pattern)

### Data Stores

**Amazon Secrets Manager**:
- **Secrets**:
  - `linkedin/api_key`: LinkedIn API key
  - `linkedin/oauth_secret`: OAuth client secret
  - `linkedin/oauth_token`: OAuth access token (rotated)
- **Access**: Lambda reads secrets at runtime (cached in memory)
- **Rotation**: Automatic (if supported) or manual

**Amazon DynamoDB** (Optional, for Mock Adapter):
- **Table**: `mock_jobs`
- **Purpose**: Test data for local development
- **Access Pattern**: Scan or query (test only)

### Scaling Characteristics

**Compute (Lambda)**:
- **Functions**: `LinkedInAdapter`, `MockAdapter`, `FutureProviderAdapter`
- **Memory**: 512 MB
- **Timeout**: 5 minutes (for API calls)
- **Reserved Concurrency**: 2 per provider (prevent rate limit violations)
- **Auto-scaling**: 0 to 5 concurrent executions per provider
- **Scaling Trigger**: Invocations from Job Sync Service
- **Cold Start**: < 200ms

**Rate Limiting**:
- **Client-side**: Track API calls per provider
- **Throttling**: Implement exponential backoff
- **Circuit Breaker**: Stop calling if failure rate > 50%

**Performance Targets**:
- API Call Latency: < 2 seconds (provider-dependent)
- Error Rate: < 5%
- Rate Limit Compliance: 100% (never exceed provider limits)

### Dependencies
- **Secrets Manager**: Provider API keys and OAuth tokens
- **External APIs**: LinkedIn, future providers
- **EventBridge**: Publish provider status events
- **X-Ray**: Distributed tracing

### Events Published
- `provider.api.called` (analytics)
- `provider.rate_limit.exceeded` (alert)
- `provider.api.error` (error tracking)
- `provider.status.changed` (health monitoring)

### Events Consumed
- None (called directly by Job Sync Service)

---

## Microservice 6: Notification Service (Future)

### Domain
**User Notifications & Alerts**

### Responsibilities
- Process saved search alerts (when new jobs match criteria)
- Send email notifications (via SES)
- Send push notifications (future: via SNS)
- Manage notification preferences
- Track notification delivery status

### APIs

#### Internal APIs (Lambda-to-Lambda)

**Send Alert**
- **Purpose**: Send alert notification to user
- **Invocation**: Direct Lambda invocation or EventBridge
- **Payload**:
  ```json
  {
    "user_id": "us-east-1:abc123",
    "search_id": "uuid-1234",
    "jobs": [
      { "job_id": "linkedin#12345", "title": "..." }
    ],
    "channel": "email|push"
  }
  ```

### Data Stores

**Amazon DynamoDB**:
- **Table**: `notifications`
- **Partition Key**: `user_id`
- **Sort Key**: `notification_id` (UUID)
- **Attributes**:
  - `search_id` (string)
  - `jobs` (list)
  - `channel` (string)
  - `status` (string: pending|sent|failed)
  - `sent_at` (ISO8601, optional)
  - `created_at` (ISO8601)

**Amazon SES**:
- **Purpose**: Send email notifications
- **Configuration**: Verified domain, SES templates
- **Rate Limits**: Based on SES account limits

### Scaling Characteristics

**Compute (Lambda)**:
- **Function**: `NotificationProcessor`
- **Memory**: 512 MB
- **Timeout**: 30 seconds
- **Reserved Concurrency**: 20
- **Auto-scaling**: 0 to 100+ concurrent executions
- **Scaling Trigger**: EventBridge events or SQS queue

**SES**:
- **Scaling**: Automatic (up to account limits)
- **Rate Limits**: 200 emails/second (production), 1 email/second (sandbox)

**Performance Targets**:
- Notification Latency: < 5 minutes (from job sync to email)
- Delivery Rate: > 95%
- Error Rate: < 1%

### Dependencies
- **EventBridge**: Consume `search.alert.enabled` and `job.sync.completed` events
- **SES**: Send emails
- **DynamoDB**: Store notification history
- **Search Management Service**: Get saved searches
- **Job Search Service**: Query matching jobs

### Events Published
- `notification.sent` (when notification is sent)
- `notification.failed` (when notification fails)

### Events Consumed
- `job.sync.completed` (trigger alert checks)
- `search.alert.enabled` (setup alert schedule)

---

## Cross-Cutting Concerns

### Authentication & Authorization

**Amazon Cognito**:
- **User Pool**: Manages user authentication
- **JWT Tokens**: Issued to authenticated users
- **API Gateway Authorizer**: Validates JWT for protected endpoints
- **Integration**: All services read `user_id` from JWT claims

### Observability

**AWS X-Ray**:
- **Tracing**: All Lambda functions instrumented
- **Service Map**: Visualize service dependencies
- **Performance Analysis**: Identify bottlenecks

**CloudWatch Logs**:
- **Centralized Logging**: All Lambda logs → CloudWatch
- **Log Groups**: One per Lambda function
- **Retention**: 30 days (configurable)

**CloudWatch Metrics**:
- **Custom Metrics**: Per-service metrics (latency, errors, throughput)
- **Alarms**: Alert on error rates, latency, DLQ depth

### Event-Driven Architecture

**Amazon EventBridge**:
- **Event Bus**: Central event bus for all services
- **Rules**: Route events to target services
- **Schema Registry**: Define event schemas (optional)

**Event Types**:
- `user.*`: User-related events
- `job.*`: Job-related events
- `search.*`: Search-related events
- `sync.*`: Sync-related events
- `notification.*`: Notification-related events

### Data Consistency

**Eventual Consistency**:
- **DynamoDB → OpenSearch**: Jobs written to DynamoDB first, then indexed in OpenSearch (eventual)
- **Sync Lag**: < 1 minute (acceptable for search use case)

**Strong Consistency**:
- **User Profile**: Strong consistency (single item reads)
- **Saved Searches**: Strong consistency (single item reads)

---

## Service Deployment & Independence

### Deployment Units

Each microservice is deployed as:
- **Separate Lambda Functions**: One or more functions per service
- **Separate CDK Stack**: Independent infrastructure stack
- **Independent Versioning**: Each service versioned separately
- **Blue/Green Deployments**: Via Lambda aliases and versions

### Service Boundaries

**Clear Boundaries**:
- Services communicate via APIs (REST) or events (EventBridge)
- No direct database access between services
- Each service owns its data stores

**Shared Resources**:
- **API Gateway**: Shared (routes to services)
- **EventBridge**: Shared (event bus)
- **Cognito**: Shared (authentication)
- **X-Ray**: Shared (tracing)

### Independent Scaling

Each service scales independently:
- **Job Search Service**: Scales with search traffic
- **User Service**: Scales with user management traffic
- **Search Management Service**: Scales with saved search operations
- **Job Sync Service**: Scales with sync frequency (limited by provider rate limits)
- **Provider Integration Service**: Scales with sync requests (limited by concurrency)
- **Notification Service**: Scales with alert triggers

---

## Summary Table

| Service | Primary Responsibility | Data Store | Scaling Trigger | Reserved Concurrency |
|---------|----------------------|------------|-----------------|---------------------|
| **Job Search** | Search & retrieve jobs | OpenSearch, DynamoDB | API requests | 50 |
| **User** | User profile management | DynamoDB | API requests | 10 |
| **Search Management** | Saved searches & alerts | DynamoDB | API requests | 10 |
| **Job Sync** | Sync jobs from providers | DynamoDB, OpenSearch | SQS queue depth | 5 |
| **Provider Integration** | External API integration | Secrets Manager | Lambda invocations | 2 per provider |
| **Notification** | Send alerts to users | DynamoDB, SES | EventBridge events | 20 |

---

## Next Steps

1. **Review service boundaries** and adjust if needed
2. **Define API contracts** (OpenAPI specs per service)
3. **Design event schemas** (EventBridge event definitions)
4. **Create CDK stacks** (one per service)
5. **Implement service interfaces** (provider adapter pattern)
6. **Set up CI/CD** (deploy services independently)
