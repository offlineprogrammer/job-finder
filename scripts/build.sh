#!/bin/bash
set -e

echo "Building all packages..."

# Build shared packages first
echo "Building shared packages..."
npm run build --workspace=packages/types
npm run build --workspace=packages/utils
npm run build --workspace=packages/aws-sdk
npm run build --workspace=packages/config

# Build services
echo "Building services..."
npm run build --workspace=services/job-search
npm run build --workspace=services/user
npm run build --workspace=services/search-management
npm run build --workspace=services/job-sync
npm run build --workspace=services/provider-integration

# Build infrastructure
echo "Building infrastructure..."
npm run build --workspace=infrastructure

# Build frontend
echo "Building frontend..."
npm run build --workspace=frontend

echo "Build complete!"
