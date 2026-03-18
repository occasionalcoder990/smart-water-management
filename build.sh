#!/usr/bin/env bash
set -e

echo "==> Installing all dependencies..."
npm install

echo "==> Building frontend..."
cd packages/frontend
npx vite build
cd ../..

echo "==> Building backend..."
cd packages/backend
npx tsc
cd ../..

echo "==> Build complete!"
