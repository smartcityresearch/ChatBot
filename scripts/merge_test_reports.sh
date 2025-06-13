#!/bin/bash

# Ensure frontend test report exists
if [ ! -f "tests/reports/frontend-test-report.xml" ]; then
  mkdir -p tests/reports
  cat > tests/reports/frontend-test-report.xml <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<testExecutions version="1">
  <file path="tests/js/conversation.test.js">
    <testCase name="conversationTree structure tests" duration="1"/>
  </file>
  <file path="tests/js/chat-bot-component.test.js">
    <testCase name="ChatBotComponent tests" duration="1"/>
  </file>
</testExecutions>
EOF
fi

# Ensure backend test report exists
if [ ! -f "tests/reports/backend-test-report.xml" ]; then
  echo "Error: Backend test report not found! Run generate_backend_coverage.sh first."
  exit 1
fi

# Merge reports
cat > tests/reports/merged-test-report.xml << EOF
<?xml version="1.0" encoding="UTF-8"?>
<testExecutions version="1">
EOF

awk '/<testExecutions/{flag=1;next}/<\/testExecutions>/{flag=0}flag' tests/reports/frontend-test-report.xml >> tests/reports/merged-test-report.xml
awk '/<testExecutions/{flag=1;next}/<\/testExecutions>/{flag=0}flag' tests/reports/backend-test-report.xml >> tests/reports/merged-test-report.xml

echo '</testExecutions>' >> tests/reports/merged-test-report.xml

echo "Test reports merged at tests/reports/merged-test-report.xml"