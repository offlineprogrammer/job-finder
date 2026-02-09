# Monorepo Structure: Job Finder Platform

## Overview

This document defines the production-ready monorepo structure for the Job Finder Platform. The structure separates infrastructure, backend services, shared libraries, and frontend while enabling independent deployment and development.

**Monorepo Tool**: npm workspaces (lightweight, native support)
**Alternative**: pnpm workspaces or Turborepo (for advanced caching)

---

## Directory Structure

```
job-finder/
├── .github/                          # GitHub Actions workflows
│   ├── workflows/
│   │   ├── ci.yml                    # Continuous integration
│   │   ├── deploy-infrastructure.yml # Deploy CDK stacks
│   │   ├── deploy-services.yml       # Deploy Lambda functions
│   │   └── deploy-frontend.yml       # Deploy Next.js app
│   └── dependabot.yml                # Dependency updates
│
├── .vscode/                          # VS Code workspace settings
│   ├── settings.json
│   ├── extensions.json
│   └── launch.json                   # Debug configurations
│
├── .cursor/                          # Cursor AI rules
│   └── rules/
│       └── AWS-Well-Architected-Job-Finder-Platform.mdc
│
├── docs/                             # Documentation
│   ├── ARCHITECTURE_DESIGN.md
│   ├── ARCHITECTURE_PROPOSAL.md
│   ├── MICROSERVICES_DESIGN.md
│   ├── MONOREPO_STRUCTURE.md
│   ├── DEPLOYMENT.md
│   └── CONTRIBUTING.md
│
├── infrastructure/                   # AWS CDK Infrastructure as Code
│   ├── package.json
│   ├── tsconfig.json
│   ├── cdk.json
│   ├── jest.config.js
│   ├── .env.example
│   │
│   ├── bin/                          # CDK app entry points
│   │   ├── app.ts                    # Main CDK app
│   │   └── environments.ts           # Environment configs
│   │
│   ├── lib/                          # CDK constructs and stacks
│   │   ├── stacks/
│   │   │   ├── base-stack.ts         # Base resources (VPC, etc.)
│   │   │   ├── data-stack.ts         # DynamoDB, OpenSearch
│   │   │   ├── api-stack.ts          # API Gateway, Cognito
│   │   │   ├── job-search-stack.ts   # Job Search Service infra
│   │   │   ├── user-stack.ts         # User Service infra
│   │   │   ├── search-mgmt-stack.ts  # Search Management Service infra
│   │   │   ├── sync-stack.ts         # Job Sync Service infra
│   │   │   ├── provider-stack.ts     # Provider Integration Service infra
│   │   │   └── notification-stack.ts # Notification Service infra (future)
│   │   │
│   │   ├── constructs/               # Reusable CDK constructs
│   │   │   ├── lambda-function.ts    # Lambda function construct
│   │   │   ├── dynamodb-table.ts     # DynamoDB table construct
│   │   │   ├── api-route.ts          # API Gateway route construct
│   │   │   └── event-rule.ts         # EventBridge rule construct
│   │   │
│   │   └── utils/                    # CDK utilities
│   │       ├── tags.ts               # Tagging utilities
│   │       └── naming.ts             # Resource naming conventions
│   │
│   └── test/                         # CDK unit tests
│       └── stacks/
│
├── services/                         # Backend Lambda Services
│   │
│   ├── job-search/                   # Job Search Service
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── jest.config.js
│   │   ├── .eslintrc.js
│   │   ├── src/
│   │   │   ├── index.ts              # Lambda handler entry
│   │   │   ├── handlers/
│   │   │   │   ├── search-jobs.ts
│   │   │   │   ├── get-job.ts
│   │   │   │   └── get-aggregations.ts
│   │   │   ├── services/
│   │   │   │   ├── opensearch-service.ts
│   │   │   │   └── dynamodb-service.ts
│   │   │   ├── models/
│   │   │   │   └── job.ts
│   │   │   ├── utils/
│   │   │   │   └── query-builder.ts
│   │   │   └── types/
│   │   │       └── api.ts
│   │   ├── tests/
│   │   │   ├── handlers/
│   │   │   └── services/
│   │   └── __mocks__/
│   │
│   ├── user/                         # User Service
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── jest.config.js
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── handlers/
│   │   │   │   ├── get-profile.ts
│   │   │   │   └── update-profile.ts
│   │   │   ├── services/
│   │   │   │   └── user-service.ts
│   │   │   └── models/
│   │   │       └── user.ts
│   │   └── tests/
│   │
│   ├── search-management/           # Search Management Service
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── handlers/
│   │   │   │   ├── list-searches.ts
│   │   │   │   ├── create-search.ts
│   │   │   │   ├── get-search.ts
│   │   │   │   ├── update-search.ts
│   │   │   │   └── delete-search.ts
│   │   │   └── services/
│   │   │       └── search-service.ts
│   │   └── tests/
│   │
│   ├── job-sync/                     # Job Sync Service
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts              # SQS handler
│   │   │   ├── handlers/
│   │   │   │   └── sync-processor.ts
│   │   │   ├── services/
│   │   │   │   ├── sync-service.ts
│   │   │   │   ├── dynamodb-writer.ts
│   │   │   │   └── opensearch-indexer.ts
│   │   │   └── transformers/
│   │   │       └── job-transformer.ts
│   │   └── tests/
│   │
│   └── provider-integration/         # Provider Integration Service
│       ├── package.json
│       ├── tsconfig.json
│       ├── src/
│       │   ├── adapters/
│       │   │   ├── base-adapter.ts   # Abstract base class
│       │   │   ├── linkedin-adapter.ts
│       │   │   ├── mock-adapter.ts
│       │   │   └── index.ts          # Adapter factory
│       │   ├── handlers/
│       │   │   └── fetch-jobs.ts     # Lambda handler
│       │   ├── services/
│       │   │   ├── oauth-service.ts
│       │   │   └── rate-limiter.ts
│       │   └── models/
│       │       └── provider-job.ts
│       └── tests/
│
├── packages/                         # Shared Libraries
│   │
│   ├── types/                        # TypeScript type definitions
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── api/                  # API request/response types
│   │   │   │   ├── job-search.ts
│   │   │   │   ├── user.ts
│   │   │   │   └── search-management.ts
│   │   │   ├── events/               # EventBridge event types
│   │   │   │   ├── job-events.ts
│   │   │   │   ├── user-events.ts
│   │   │   │   └── sync-events.ts
│   │   │   ├── models/               # Domain models
│   │   │   │   ├── job.ts
│   │   │   │   ├── user.ts
│   │   │   │   └── saved-search.ts
│   │   │   └── aws/                  # AWS-specific types
│   │   │       ├── lambda.ts
│   │   │       └── api-gateway.ts
│   │   └── dist/                     # Compiled output
│   │
│   ├── utils/                        # Shared utilities
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── logger.ts             # Structured logging
│   │   │   ├── errors.ts             # Error handling utilities
│   │   │   ├── validation.ts         # Input validation
│   │   │   ├── date.ts               # Date utilities
│   │   │   └── crypto.ts             # Crypto utilities
│   │   └── dist/
│   │
│   ├── aws-sdk/                      # AWS SDK wrappers
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── dynamodb-client.ts    # DynamoDB wrapper
│   │   │   ├── opensearch-client.ts  # OpenSearch wrapper
│   │   │   ├── secrets-client.ts     # Secrets Manager wrapper
│   │   │   └── eventbridge-client.ts # EventBridge wrapper
│   │   └── dist/
│   │
│   └── config/                       # Configuration management
│       ├── package.json
│       ├── tsconfig.json
│       ├── src/
│       │   ├── index.ts
│       │   ├── env.ts                # Environment variables
│       │   ├── feature-flags.ts      # Feature flags
│       │   └── constants.ts          # Constants
│       └── dist/
│
├── frontend/                         # Next.js Frontend Application
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.js
│   ├── tailwind.config.js
│   ├── .eslintrc.js
│   ├── .env.example
│   │
│   ├── public/                       # Static assets
│   │   ├── images/
│   │   └── favicon.ico
│   │
│   ├── src/
│   │   ├── app/                      # Next.js App Router
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx              # Home page
│   │   │   ├── (auth)/
│   │   │   │   ├── login/
│   │   │   │   └── signup/
│   │   │   ├── (dashboard)/
│   │   │   │   ├── jobs/
│   │   │   │   ├── searches/
│   │   │   │   └── profile/
│   │   │   └── api/                  # API routes (if needed)
│   │   │
│   │   ├── components/               # React components
│   │   │   ├── ui/                   # Base UI components
│   │   │   ├── job/                  # Job-related components
│   │   │   ├── search/               # Search components
│   │   │   └── layout/               # Layout components
│   │   │
│   │   ├── lib/                      # Frontend utilities
│   │   │   ├── api/                  # API client
│   │   │   │   ├── client.ts
│   │   │   │   ├── jobs.ts
│   │   │   │   ├── user.ts
│   │   │   │   └── searches.ts
│   │   │   ├── auth/                 # Auth utilities
│   │   │   │   └── cognito.ts
│   │   │   └── utils/
│   │   │
│   │   ├── hooks/                    # React hooks
│   │   │   ├── use-jobs.ts
│   │   │   ├── use-auth.ts
│   │   │   └── use-searches.ts
│   │   │
│   │   ├── store/                    # State management (Zustand/Redux)
│   │   │   ├── auth-store.ts
│   │   │   └── job-store.ts
│   │   │
│   │   └── types/                    # Frontend-specific types
│   │       └── index.ts
│   │
│   ├── tests/                        # Frontend tests
│   │   ├── __mocks__/
│   │   ├── components/
│   │   └── utils/
│   │
│   └── .next/                        # Next.js build output (gitignored)
│
├── scripts/                          # Build and deployment scripts
│   ├── build.sh                      # Build all packages
│   ├── test.sh                       # Run all tests
│   ├── deploy.sh                     # Deploy to AWS
│   ├── lint.sh                       # Lint all code
│   └── setup.sh                      # Initial setup script
│
├── .gitignore
├── .eslintrc.js                      # Root ESLint config
├── .prettierrc                       # Prettier config
├── .prettierignore
├── package.json                      # Root package.json (workspaces)
├── tsconfig.base.json                # Base TypeScript config
├── turbo.json                        # Turborepo config (optional)
└── README.md
```

---

## Package.json Structure

### Root `package.json`

```json
{
  "name": "job-finder",
  "version": "1.0.0",
  "private": true,
  "workspaces": ["infrastructure", "services/*", "packages/*", "frontend"],
  "scripts": {
    "build": "npm run build --workspaces --if-present",
    "test": "npm run test --workspaces --if-present",
    "lint": "npm run lint --workspaces --if-present",
    "clean": "npm run clean --workspaces --if-present",
    "deploy:infra": "cd infrastructure && npm run deploy",
    "deploy:services": "npm run deploy --workspace=services/*",
    "deploy:frontend": "cd frontend && npm run deploy",
    "typecheck": "npm run typecheck --workspaces --if-present",
    "format": "prettier --write \"**/*.{ts,tsx,js,jsx,json,md}\"",
    "format:check": "prettier --check \"**/*.{ts,tsx,js,jsx,json,md}\""
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "eslint": "^8.0.0",
    "prettier": "^3.0.0",
    "typescript": "^5.0.0"
  },
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  }
}
```

### Service `package.json` Example (job-search)

```json
{
  "name": "@job-finder/job-search",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "jest",
    "lint": "eslint src --ext .ts",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@job-finder/types": "*",
    "@job-finder/utils": "*",
    "@job-finder/aws-sdk": "*",
    "@aws-sdk/client-dynamodb": "^3.0.0",
    "@aws-sdk/client-opensearch": "^3.0.0",
    "@aws-sdk/client-xray": "^3.0.0"
  },
  "devDependencies": {
    "@types/aws-lambda": "^8.10.0",
    "@types/jest": "^29.0.0",
    "jest": "^29.0.0",
    "ts-jest": "^29.0.0",
    "typescript": "^5.0.0"
  }
}
```

### Shared Package `package.json` Example (types)

```json
{
  "name": "@job-finder/types",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

---

## TypeScript Configuration

### Root `tsconfig.base.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "baseUrl": ".",
    "paths": {
      "@job-finder/types": ["packages/types/src"],
      "@job-finder/utils": ["packages/utils/src"],
      "@job-finder/aws-sdk": ["packages/aws-sdk/src"],
      "@job-finder/config": ["packages/config/src"]
    }
  },
  "exclude": ["node_modules", "dist", "**/*.test.ts", "**/*.spec.ts"]
}
```

### Service `tsconfig.json` (extends base)

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "baseUrl": "./src",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

---

## Build & Deployment Strategy

### Build Order

1. **Shared Packages** (types, utils, aws-sdk, config)
2. **Services** (depend on shared packages)
3. **Infrastructure** (CDK, depends on service build outputs)
4. **Frontend** (depends on shared types)

### Deployment Strategy

**Independent Deployment**:

- Each service can be deployed independently
- Infrastructure changes require CDK deployment first
- Frontend can be deployed independently

**Deployment Scripts**:

```bash
# Deploy infrastructure
npm run deploy:infra -- --env production

# Deploy specific service
cd services/job-search
npm run deploy

# Deploy all services
npm run deploy:services

# Deploy frontend
npm run deploy:frontend
```

---

## CI/CD Pipeline

### GitHub Actions Workflow Structure

**`.github/workflows/ci.yml`**:

- Run tests for all packages
- Lint all code
- Type check all TypeScript
- Build all packages (verify builds succeed)

**`.github/workflows/deploy-infrastructure.yml`**:

- Trigger: Push to `main` or manual
- Steps:
  1. Checkout code
  2. Install dependencies
  3. Build CDK
  4. Run CDK synth (validate)
  5. Deploy to dev/stage/prod (based on branch)

**`.github/workflows/deploy-services.yml`**:

- Trigger: Push to `main` or changes in `services/`
- Steps:
  1. Detect changed services
  2. Build changed services
  3. Run tests for changed services
  4. Deploy Lambda functions (via CDK or SAM)

**`.github/workflows/deploy-frontend.yml`**:

- Trigger: Push to `main` or changes in `frontend/`
- Steps:
  1. Build Next.js app
  2. Run tests
  3. Deploy to Vercel/Amplify/S3+CloudFront

---

## Development Workflow

### Local Development Setup

```bash
# Clone repository
git clone <repo-url>
cd job-finder

# Install all dependencies (workspace-aware)
npm install

# Build all packages
npm run build

# Run tests
npm run test

# Start local development
cd services/job-search
npm run dev  # Uses SAM Local or similar
```

### Working on a Service

```bash
# Navigate to service
cd services/job-search

# Install dependencies (if needed)
npm install

# Build
npm run build

# Run tests
npm test

# Watch mode (if supported)
npm run test:watch
```

### Working on Shared Packages

```bash
# Navigate to package
cd packages/types

# Build
npm run build

# Changes are automatically available to services (via workspace symlinks)
```

---

## Testing Strategy

### Unit Tests

- **Location**: `services/*/tests/`, `packages/*/tests/`
- **Framework**: Jest
- **Coverage**: Target 80%+ for services

### Integration Tests

- **Location**: `tests/integration/`
- **Framework**: Jest + AWS SDK mocks
- **Scope**: Test service interactions

### E2E Tests

- **Location**: `tests/e2e/`
- **Framework**: Playwright or Cypress
- **Scope**: Full user flows

### CDK Tests

- **Location**: `infrastructure/test/`
- **Framework**: Jest + CDK assertions
- **Scope**: Validate infrastructure definitions

---

## Code Organization Principles

### Service Structure

Each service follows this pattern:

```
service-name/
├── src/
│   ├── index.ts           # Lambda handler entry point
│   ├── handlers/          # Request handlers (one per API endpoint)
│   ├── services/          # Business logic
│   ├── models/            # Domain models
│   ├── utils/             # Service-specific utilities
│   └── types/             # Service-specific types
├── tests/                 # Tests mirror src structure
└── package.json
```

### Shared Package Structure

```
package-name/
├── src/
│   ├── index.ts           # Public API exports
│   ├── [feature]/         # Feature modules
│   └── types/             # Type definitions
├── dist/                  # Compiled output
└── package.json
```

---

## Environment Management

### Environment Files

**`.env.example`** (per service/package):

```bash
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=123456789012

# Service Configuration
ENVIRONMENT=dev
LOG_LEVEL=info

# External APIs
LINKEDIN_API_KEY=your-api-key
```

**Environment-Specific**:

- `.env.dev`
- `.env.staging`
- `.env.production`

**CDK Environments** (`infrastructure/bin/environments.ts`):

```typescript
export const environments = {
  dev: {
    account: '123456789012',
    region: 'us-east-1',
  },
  staging: {
    account: '123456789012',
    region: 'us-east-1',
  },
  production: {
    account: '987654321098',
    region: 'us-east-1',
  },
};
```

---

## Dependency Management

### Workspace Dependencies

**Shared packages** are referenced using workspace protocol:

```json
{
  "dependencies": {
    "@job-finder/types": "*",
    "@job-finder/utils": "*"
  }
}
```

**External dependencies** are versioned normally:

```json
{
  "dependencies": {
    "@aws-sdk/client-dynamodb": "^3.0.0"
  }
}
```

### Versioning Strategy

- **Shared packages**: Semantic versioning (1.0.0)
- **Services**: Versioned independently (can use same version or different)
- **Breaking changes**: Update major version, update all dependents

---

## Documentation Structure

### Documentation Files

- **`docs/ARCHITECTURE_DESIGN.md`**: System architecture
- **`docs/MICROSERVICES_DESIGN.md`**: Microservices breakdown
- **`docs/DEPLOYMENT.md`**: Deployment procedures
- **`docs/CONTRIBUTING.md`**: Contribution guidelines
- **`README.md`**: Project overview and quick start

### Service Documentation

Each service should include:

- **`README.md`**: Service overview, API docs, local development
- **Inline code comments**: JSDoc for public APIs

---

## Git Strategy

### Branching Strategy

- **`main`**: Production-ready code
- **`develop`**: Integration branch
- **`feature/*`**: Feature branches
- **`fix/*`**: Bug fix branches
- **`release/*`**: Release preparation branches

### Commit Conventions

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat(service-name): add new feature`
- `fix(service-name): fix bug`
- `docs: update documentation`
- `refactor(service-name): refactor code`
- `test(service-name): add tests`

---

## Tooling & Linting

### ESLint Configuration

**Root `.eslintrc.js`**:

```javascript
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'off',
  },
};
```

### Prettier Configuration

**`.prettierrc`**:

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2
}
```

---

## Security Considerations

### Secrets Management

- **Never commit secrets** to Git
- **Use AWS Secrets Manager** for runtime secrets
- **Use environment variables** for build-time config (via CI/CD)
- **Rotate secrets regularly**

### Dependency Security

- **Dependabot**: Automatic dependency updates
- **npm audit**: Regular security audits
- **Snyk** (optional): Advanced vulnerability scanning

---

## Performance Optimization

### Build Optimization

- **Incremental builds**: TypeScript incremental compilation
- **Parallel builds**: Use Turborepo or npm workspaces parallel execution
- **Caching**: Cache node_modules and build outputs

### Deployment Optimization

- **Selective deployment**: Only deploy changed services
- **CDK diff**: Preview infrastructure changes before deployment
- **Lambda layers**: Share common dependencies

---

## Monitoring & Observability

### Logging

- **Structured logging**: JSON format
- **Correlation IDs**: Track requests across services
- **Log levels**: ERROR, WARN, INFO, DEBUG

### Metrics

- **CloudWatch Metrics**: Custom metrics per service
- **X-Ray**: Distributed tracing
- **Service-level dashboards**: Per-service CloudWatch dashboards

---

## Migration Path

### Phase 1: Initial Setup

1. Create monorepo structure
2. Set up workspaces
3. Create shared packages (types, utils)
4. Migrate existing code (if any)

### Phase 2: Service Implementation

1. Implement Job Search Service
2. Implement User Service
3. Implement remaining services incrementally

### Phase 3: Infrastructure

1. Create CDK stacks
2. Deploy to dev environment
3. Test end-to-end

### Phase 4: Frontend

1. Create Next.js app
2. Integrate with backend APIs
3. Deploy frontend

---

## Best Practices

1. **Keep services independent**: No direct imports between services
2. **Use shared packages**: For common code (types, utils)
3. **Version shared packages**: When making breaking changes
4. **Test in isolation**: Each service should be testable independently
5. **Document APIs**: Use OpenAPI/Swagger for REST APIs
6. **Follow naming conventions**: Consistent naming across services
7. **Keep builds fast**: Optimize build times for developer experience
8. **Automate everything**: CI/CD, testing, deployment

---

## Next Steps

1. **Review and approve** this monorepo structure
2. **Initialize repository** with this structure
3. **Set up CI/CD pipelines** (GitHub Actions)
4. **Create initial shared packages** (types, utils)
5. **Implement first service** (Job Search Service)
6. **Set up infrastructure** (CDK stacks)

---

## References

- [npm Workspaces](https://docs.npmjs.com/cli/v9/using-npm/workspaces)
- [Turborepo](https://turborepo.org/) (optional, for advanced caching)
- [AWS CDK Best Practices](https://docs.aws.amazon.com/cdk/v2/guide/best-practices.html)
- [Monorepo Tools Comparison](https://monorepo.tools/)
