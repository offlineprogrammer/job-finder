# Job Finder Platform

A production-ready, serverless-first job search platform built on AWS, following the AWS Well-Architected Framework.

## Architecture

- **Serverless-First**: API Gateway + Lambda functions
- **Microservices**: 6 independent services
- **Data**: DynamoDB + Amazon OpenSearch
- **Infrastructure**: AWS CDK (TypeScript)
- **Frontend**: Next.js + TypeScript

## Project Structure

```
job-finder/
├── infrastructure/     # AWS CDK Infrastructure as Code
├── services/          # Backend Lambda Services
├── packages/          # Shared Libraries
└── frontend/          # Next.js Frontend Application
```

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- AWS CLI configured
- AWS CDK CLI installed (`npm install -g aws-cdk`)

### Installation

```bash
# Install all dependencies
npm install

# Build all packages
npm run build

# Run tests
npm test
```

### Development

```bash
# Work on a specific service
cd services/job-search
npm run dev

# Work on infrastructure
cd infrastructure
npm run cdk synth
```

## Documentation

- [Architecture Design](./docs/ARCHITECTURE_DESIGN.md)
- [Microservices Design](./docs/MICROSERVICES_DESIGN.md)
- [Monorepo Structure](./docs/MONOREPO_STRUCTURE.md)

## Services

1. **Job Search Service** - Search and retrieve jobs
2. **User Service** - User profile management
3. **Search Management Service** - Saved searches and alerts
4. **Job Sync Service** - Synchronize jobs from providers
5. **Provider Integration Service** - External provider adapters
6. **Notification Service** - User notifications (future)

## Deployment

```bash
# Deploy infrastructure
npm run deploy:infra -- --env production

# Deploy services
npm run deploy:services

# Deploy frontend
npm run deploy:frontend
```

## License

MIT
