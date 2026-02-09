# AWS Architecture Proposal: Job Finder Platform

## Executive Summary

This document proposes two production-ready AWS architectures for the job-finder platform:
1. **Serverless-First Architecture** (API Gateway + Lambda)
2. **ECS-Based Architecture** (Fargate containers)

Both architectures follow AWS Well-Architected Framework principles and support:
- LinkedIn API integration (no scraping)
- User authentication via Cognito
- Job search with filtering (location, salary, keywords, remote)
- Saved searches and future alert capabilities
- Provider-adapter pattern for job sources

---

## Architecture 1: Serverless-First

### Component Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend Layer                        │
│  Next.js (CloudFront + S3) or Vercel/Amplify Hosting        │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTPS
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Gateway (REST)                       │
│  - Cognito Authorizer                                         │
│  - Rate Limiting / Throttling                                 │
│  - Request/Response Validation                                │
└──────┬──────────────────┬──────────────────┬─────────────────┘
       │                  │                  │
       ▼                  ▼                  ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│   Lambda    │  │   Lambda    │  │   Lambda    │
│  Job Search │  │  Job Sync   │  │  User Mgmt  │
└──────┬──────┘  └──────┬──────┘  └──────┬──────┘
       │                │                │
       │                │                │
       ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────┐
│                    Data & Search Layer                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  DynamoDB    │  │  OpenSearch  │  │  Secrets     │      │
│  │  (Jobs,      │  │  (Full-text  │  │  Manager     │      │
│  │   Users,     │  │   Search)    │  │  (API Keys)  │      │
│  │   Searches)  │  │              │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
       │                │
       │                │
       ▼                ▼
┌─────────────────────────────────────────────────────────────┐
│                   Async Processing Layer                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  EventBridge │  │     SQS      │  │   Lambda    │      │
│  │  (Events)    │  │  (Job Sync   │  │  Processors │      │
│  │              │  │   Queue)     │  │  (DLQ)      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│                  External Integration Layer                   │
│  ┌──────────────┐  ┌──────────────┐                        │
│  │  Lambda      │  │  Lambda      │                        │
│  │  LinkedIn    │  │  Provider    │                        │
│  │  Adapter     │  │  Adapters    │                        │
│  └──────────────┘  └──────────────┘                        │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

**Compute:**
- **API Gateway**: REST API with Cognito authorizer, throttling (10,000 req/sec default)
- **Lambda Functions**: 
  - Job Search API (search, filter, pagination)
  - Job Sync Service (periodic sync from providers)
  - User Management (profile, saved searches)
  - Provider Adapters (LinkedIn, future providers)
  - Event Processors (async job processing)

**Data Storage:**
- **DynamoDB**: 
  - `jobs` table (partition: provider_id, sort: job_id)
  - `users` table (partition: user_id)
  - `saved_searches` table (partition: user_id, sort: search_id)
  - GSIs for location, salary range, remote flag
- **Amazon OpenSearch**: Full-text search index synced from DynamoDB via Lambda
- **Secrets Manager**: LinkedIn API keys, OAuth credentials

**Async Processing:**
- **EventBridge**: Job sync schedules, user events
- **SQS**: Job sync queue (standard or FIFO for ordering)
- **DLQ**: Dead-letter queues for failed processing

**Observability:**
- **CloudWatch Logs**: Centralized logging
- **CloudWatch Metrics**: Custom metrics (search latency, sync success rate)
- **X-Ray**: Distributed tracing across Lambda functions
- **CloudWatch Alarms**: Error rates, throttling, DLQ depth

**Security:**
- **Cognito**: User authentication/authorization
- **IAM Roles**: Least-privilege per Lambda function
- **VPC**: Optional VPC endpoints for DynamoDB/OpenSearch (private)
- **WAF**: DDoS protection, rate limiting
- **Encryption**: KMS for DynamoDB, Secrets Manager, Lambda env vars

---

## Architecture 2: ECS-Based

### Component Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend Layer                        │
│  Next.js (CloudFront + S3) or Vercel/Amplify Hosting        │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTPS
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Application Load Balancer (ALB)                  │
│  - Cognito Authentication                                     │
│  - SSL Termination                                            │
│  - Health Checks                                               │
└──────┬──────────────────┬──────────────────┬─────────────────┘
       │                  │                  │
       ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    ECS Fargate Services                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  API Service │  │  Sync Service│  │  Worker      │      │
│  │  (2-10 tasks)│  │  (1-3 tasks) │  │  Service     │      │
│  │  Port 3000   │  │  Port 3001   │  │  (1-5 tasks) │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
       │                │                │
       │                │                │
       ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────┐
│                    Data & Search Layer                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  RDS         │  │  OpenSearch  │  │  Secrets     │      │
│  │  PostgreSQL  │  │  (Full-text  │  │  Manager     │      │
│  │  (Multi-AZ)  │  │   Search)    │  │  (API Keys)  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
       │                │
       │                │
       ▼                ▼
┌─────────────────────────────────────────────────────────────┐
│                   Async Processing Layer                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  EventBridge │  │     SQS      │  │  ECS Tasks   │      │
│  │  (Events)    │  │  (Job Sync   │  │  (DLQ)       │      │
│  │              │  │   Queue)     │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

**Compute:**
- **ECS Fargate**: Containerized Node.js services
  - **API Service**: REST API (Express/Fastify), auto-scaling 2-10 tasks
  - **Sync Service**: Background job sync, 1-3 tasks
  - **Worker Service**: Async queue processors, 1-5 tasks
- **Application Load Balancer**: 
  - Cognito authentication
  - SSL termination
  - Health checks (ECS service integration)
  - Target groups per service

**Data Storage:**
- **RDS PostgreSQL** (Multi-AZ):
  - `jobs`, `users`, `saved_searches` tables
  - Connection pooling (RDS Proxy recommended)
  - Automated backups, point-in-time recovery
- **Amazon OpenSearch**: Full-text search (synced via application code or DMS)
- **Secrets Manager**: API keys, DB credentials

**Networking:**
- **VPC**: Public/private subnets across 2+ AZs
- **NAT Gateway**: Outbound internet access for private subnets
- **Security Groups**: Least-privilege rules per service
- **VPC Endpoints**: Private access to S3, Secrets Manager (optional)

**Async Processing:**
- **EventBridge**: Scheduled syncs, events
- **SQS**: Job sync queue
- **ECS Tasks**: Long-running workers for queue processing

**Observability:**
- **CloudWatch Logs**: ECS log driver → CloudWatch
- **CloudWatch Metrics**: ECS service metrics, custom app metrics
- **X-Ray**: Distributed tracing (instrumented in app code)
- **CloudWatch Alarms**: Service health, queue depth, error rates

**Security:**
- **Cognito**: User authentication
- **IAM Roles**: Task execution roles, task roles per service
- **Secrets Manager**: Database credentials injected as env vars
- **WAF**: DDoS protection on ALB
- **Encryption**: KMS for RDS, EBS volumes, secrets

---

## Detailed Comparison

### 1. Security

| Aspect | Serverless-First | ECS-Based | Winner |
|--------|-----------------|-----------|--------|
| **Attack Surface** | Minimal (no OS/containers to patch) | Larger (container runtime, OS) | Serverless |
| **IAM Granularity** | Per-function roles, fine-grained | Per-service roles, still granular | Serverless |
| **Secrets Management** | Secrets Manager, Lambda env vars | Secrets Manager, ECS task env vars | Tie |
| **Network Isolation** | Optional VPC endpoints (private) | VPC required, private subnets | ECS (more control) |
| **DDoS Protection** | API Gateway + WAF | ALB + WAF | Tie |
| **Compliance** | SOC 2, PCI-DSS compliant | SOC 2, PCI-DSS compliant | Tie |
| **Vulnerability Scanning** | AWS managed | Requires ECR scanning + runtime | Serverless |
| **Patch Management** | AWS managed (Lambda runtime) | Manual (container base images) | Serverless |

**Security Verdict**: **Serverless-First** wins due to smaller attack surface, AWS-managed patching, and fine-grained IAM per function.

---

### 2. Scalability

| Aspect | Serverless-First | ECS-Based | Winner |
|--------|-----------------|-----------|--------|
| **Auto-scaling** | Automatic (0 to 1000+ concurrent executions) | Manual config (min/max tasks, target tracking) | Serverless |
| **Cold Starts** | 100-500ms (mitigated with provisioned concurrency) | None (warm containers) | ECS |
| **Scaling Speed** | Seconds (instant for burst traffic) | Minutes (ECS service scaling) | Serverless |
| **Concurrent Requests** | 1000+ per function (configurable) | Limited by task count × concurrency | Serverless |
| **Cost at Scale** | Pay per request (costs scale linearly) | Pay for running tasks (fixed cost) | Depends on load |
| **Database Connections** | DynamoDB (no connection pooling needed) | RDS (requires connection pooling, limits) | Serverless |
| **Burst Traffic** | Handles spikes automatically | Requires pre-scaling or over-provisioning | Serverless |

**Scalability Verdict**: **Serverless-First** wins for automatic scaling, burst handling, and no connection pool limits. ECS requires more planning for scale.

---

### 3. Cost

#### Cost Assumptions (Monthly)
- **Traffic**: 1M API requests/month, 100K job syncs/month
- **Data**: 10M jobs stored, 100K users, 500K saved searches
- **Search**: OpenSearch (2 nodes, t3.small.search)
- **Region**: us-east-1

#### Serverless-First Cost Breakdown

| Component | Cost Estimate |
|-----------|---------------|
| **API Gateway** | $3.50 (1M requests @ $3.50/million) |
| **Lambda** | ~$20 (1M requests × 200ms avg × 512MB = ~$15; sync jobs ~$5) |
| **DynamoDB** | ~$25 (10M items × $0.25/million reads, $1.25/million writes) |
| **OpenSearch** | ~$60 (2 × t3.small.search @ $30/month) |
| **SQS** | ~$0.40 (100K requests) |
| **EventBridge** | ~$1 (100K custom events) |
| **CloudWatch** | ~$10 (logs, metrics, alarms) |
| **Data Transfer** | ~$5 (outbound) |
| **Secrets Manager** | ~$0.40 (3 secrets) |
| **Total** | **~$125/month** |

#### ECS-Based Cost Breakdown

| Component | Cost Estimate |
|-----------|---------------|
| **ECS Fargate** | ~$75 (API: 2 tasks × 0.5 vCPU × 1GB × $0.04/hr × 730hrs = $29; Sync: 1 task = $15; Worker: 1 task = $15; ALB: $16) |
| **RDS PostgreSQL** | ~$150 (db.t3.medium Multi-AZ @ ~$150/month) |
| **OpenSearch** | ~$60 (same as serverless) |
| **SQS** | ~$0.40 (same) |
| **EventBridge** | ~$1 (same) |
| **CloudWatch** | ~$10 (same) |
| **NAT Gateway** | ~$32 (1 NAT × $0.045/hr × 730hrs) |
| **Data Transfer** | ~$5 (same) |
| **Secrets Manager** | ~$0.40 (same) |
| **Total** | **~$333/month** |

**Cost Verdict**: **Serverless-First** is ~60% cheaper at this scale. ECS becomes more cost-effective only at very high, consistent load (>10M requests/month, 24/7 utilization).

---

### 4. Operational Complexity

| Aspect | Serverless-First | ECS-Based | Winner |
|--------|-----------------|-----------|--------|
| **Infrastructure Management** | Low (CDK defines Lambda, API Gateway) | Medium (CDK defines ECS, ALB, VPC, RDS) | Serverless |
| **Deployment** | Simple (zip/container → Lambda) | Medium (build image → ECR → ECS update) | Serverless |
| **Monitoring** | CloudWatch Logs/Metrics (automatic) | CloudWatch + app instrumentation | Serverless |
| **Debugging** | X-Ray traces, CloudWatch Logs | X-Ray + container logs, SSH access | Tie |
| **Local Development** | SAM/Serverless Framework | Docker Compose + LocalStack | Tie |
| **CI/CD Complexity** | Low (deploy Lambda functions) | Medium (build/push images, ECS updates) | Serverless |
| **Database Management** | DynamoDB (managed, auto-scaling) | RDS (backups, patches, scaling) | Serverless |
| **Capacity Planning** | Not needed (auto-scales) | Required (task sizing, scaling policies) | Serverless |
| **Disaster Recovery** | Multi-region Lambda + DynamoDB Global Tables | Multi-region ECS + RDS Multi-AZ/Read Replicas | Tie |
| **Learning Curve** | Lower (serverless patterns) | Higher (containers, orchestration) | Serverless |

**Operational Complexity Verdict**: **Serverless-First** wins significantly—less infrastructure to manage, simpler deployments, no capacity planning.

---

## Additional Considerations

### When Serverless-First Makes Sense
✅ Variable/spiky traffic patterns  
✅ Rapid iteration and deployment  
✅ Small to medium team (fewer ops engineers)  
✅ Cost optimization priority  
✅ Event-driven workloads  

### When ECS-Based Makes Sense
✅ Predictable, high-volume traffic (24/7)  
✅ Long-running processes (>15 minutes)  
✅ Complex stateful workloads  
✅ Need for container portability  
✅ Existing container expertise  
✅ Very low latency requirements (no cold starts)  

---

## Recommendation: **Serverless-First Architecture**

### Rationale

1. **Cost Efficiency**: ~60% lower cost at expected scale, pay-per-use model
2. **Operational Simplicity**: Less infrastructure to manage, faster deployments
3. **Security**: Smaller attack surface, AWS-managed patching
4. **Scalability**: Automatic scaling handles traffic spikes without pre-planning
5. **Alignment with Requirements**: 
   - Job search is request-driven (perfect for Lambda)
   - Async sync jobs fit EventBridge/SQS patterns
   - No long-running processes required
   - Provider-adapter pattern works well with Lambda functions

### Migration Path (if needed later)

If traffic grows to >10M requests/month with consistent load, consider:
- **Hybrid Approach**: Keep API in Lambda, move sync workers to ECS Fargate
- **Full ECS Migration**: Gradual migration with blue/green deployments

### Implementation Phases

**Phase 1: Core Services**
- API Gateway + Lambda (Job Search API)
- DynamoDB (jobs, users, saved_searches)
- Cognito authentication
- OpenSearch integration

**Phase 2: Async Processing**
- EventBridge schedules
- SQS queues
- Lambda sync processors
- Provider adapters (LinkedIn)

**Phase 3: Observability & Optimization**
- X-Ray tracing
- CloudWatch alarms
- Provisioned concurrency (if cold starts are an issue)
- Caching (ElastiCache, if needed)

---

## Next Steps

1. **Review and approve** this architecture proposal
2. **Define detailed service boundaries** (microservices vs monolith Lambda)
3. **Design data models** (DynamoDB schemas, OpenSearch mappings)
4. **Create CDK project structure** (libs per service, shared constructs)
5. **Implement Phase 1** (core API + authentication)

---

## Questions for Discussion

1. **Expected traffic patterns**: Peak hours, geographic distribution?
2. **Data retention**: How long to keep job listings? (affects DynamoDB/OpenSearch sizing)
3. **Multi-tenancy**: Single-tenant or multi-tenant? (affects data isolation)
4. **Compliance requirements**: GDPR, SOC 2, HIPAA? (affects encryption, audit logging)
5. **Budget constraints**: Any specific cost targets?
