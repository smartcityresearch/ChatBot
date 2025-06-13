#!/bin/bash

# Install dependencies if needed
npm install --legacy-peer-deps
npm install --save-dev jest-junit --legacy-peer-deps

# Run Jest with coverage
./node_modules/.bin/jest \
  --config=jest.config.js \
  --coverage

# Ensure directory exists
mkdir -p coverage/frontend
find coverage -mindepth 1 -maxdepth 1 ! -name frontend -exec cp -r {} coverage/frontend/ \;

echo "Frontend coverage generated at coverage/frontend/"