#!/usr/bin/env bash
set -e

echo "==> Installing ALL dependencies (including dev)..."
npm install --include-dev

echo "==> Installing frontend dependencies locally..."
cd packages/frontend
npm install --include-dev --install-strategy=nested
echo "==> Building frontend..."
npx vite build
cd ../..

echo "==> Installing backend dependencies locally..."
cd packages/backend
npm install --include-dev --install-strategy=nested
echo "==> Building backend..."
npx tsc
cd ../..

echo "==> Build complete!"
