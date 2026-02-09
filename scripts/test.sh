#!/bin/bash
set -e

echo "Running tests..."

# Run tests for all workspaces
npm run test --workspaces --if-present

echo "Tests complete!"
