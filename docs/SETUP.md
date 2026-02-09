# Setup Guide

## Initial Setup

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- AWS CLI configured
- AWS CDK CLI installed (`npm install -g aws-cdk`)

### Installation

```bash
# Install all dependencies (workspace-aware)
npm install

# Build all packages
npm run build

# Run tests
npm test
```

## Project Structure

```
job-finder/
├── infrastructure/          # AWS CDK Infrastructure
├── services/                 # Backend Lambda Services
│   ├── job-search/
│   ├── user/
│   ├── search-management/
│   ├── job-sync/
│   └── provider-integration/
├── packages/                # Shared Libraries
│   ├── types/
│   ├── utils/
│   ├── aws-sdk/
│   └── config/
└── frontend/                 # Next.js Frontend
```

## Development Workflow

### Working on a Service

```bash
cd services/job-search
npm run build
npm test
```

### Working on Shared Packages

```bash
cd packages/types
npm run build
# Changes are automatically available via workspace symlinks
```

### Building Everything

```bash
# From root
npm run build

# Or use script
./scripts/build.sh
```

## Next Steps

1. **Install dependencies**: `npm install`
2. **Build shared packages**: `npm run build --workspace=packages/*`
3. **Implement services**: Start with Job Search Service
4. **Set up AWS**: Configure CDK and deploy infrastructure
5. **Develop frontend**: Build Next.js UI

## Environment Variables

Copy `.env.example` files in each service/package and configure:

- `infrastructure/.env.example` → `.env`
- `frontend/.env.example` → `.env.local`

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.
