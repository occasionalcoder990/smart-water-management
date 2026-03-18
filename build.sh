#!/usr/bin/env bash
set -e

echo "==> Installing root dependencies..."
npm install

echo "==> Installing frontend dependencies..."
cd packages/frontend
npm install --include-dev
echo "==> Building frontend..."
npx vite build
cd ../..

echo "==> Installing backend dependencies..."
cd packages/backend
npm install --include-dev
echo "==> Building backend..."
npx tsc
cd ../..

echo "==> Build complete!"
