#!/bin/bash
set -e  # Exit immediately if a command exits with non-zero status

# Ensure we're in the project root directory
cd "$(dirname "$0")/.."

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
  echo "Creating virtual environment..."
  python3 -m venv venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install --upgrade pip
pip install pytest pytest-cov fastapi uvicorn python-dotenv pydantic requests pytz httpx aiohttp mistralai==0.0.7 pytest-mock pytest-asyncio

# Create .coveragerc
cat > .coveragerc << EOF
[run]
omit =
    tests/*
    */__pycache__/*
    */coverage/*
    */node_modules/*
    venv/*

[report]
exclude_lines =
    pragma: no cover
    def __repr__
    raise NotImplementedError
    if __name__ == .__main__.:
    pass
    raise ImportError
EOF

# Ensure directories exist
mkdir -p coverage/backend
mkdir -p tests/reports

# Run tests with coverage
echo "Running tests with coverage..."
export PYTHONPATH=$PYTHONPATH:$(pwd)
pytest --junitxml=tests/reports/backend-test-report.xml --cov=./ --cov-report=xml:coverage/backend/coverage.xml --cov-config=.coveragerc tests/test_*.py -v

echo "Backend coverage generated at coverage/backend/coverage.xml"
echo "Backend test report generated at tests/reports/backend-test-report.xml"

# Deactivate virtual environment
deactivate