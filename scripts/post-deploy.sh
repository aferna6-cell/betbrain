#!/bin/bash
# Post-deploy verification — checks the /api/health endpoint
# Usage: ./scripts/post-deploy.sh [base-url]
#
# Examples:
#   ./scripts/post-deploy.sh https://betbrain-lemon.vercel.app
#   ./scripts/post-deploy.sh http://localhost:3000

BASE_URL="${1:-http://localhost:3000}"
HEALTH_URL="$BASE_URL/api/health"

echo "Checking $HEALTH_URL ..."

RESPONSE=$(curl -s "$HEALTH_URL")
if [ $? -ne 0 ]; then
  echo "FAIL: Could not reach $HEALTH_URL"
  exit 1
fi

STATUS=$(echo "$RESPONSE" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
CONFIGURED=$(echo "$RESPONSE" | grep -o '"configured":"[^"]*"' | cut -d'"' -f4)
DATABASE=$(echo "$RESPONSE" | grep -o '"database":"[^"]*"' | cut -d'"' -f4)

echo ""
echo "Status:     $STATUS"
echo "Env vars:   $CONFIGURED"
echo "Database:   $DATABASE"
echo ""

# Check for missing env vars
MISSING=$(echo "$RESPONSE" | grep -o '"[a-z_]*":"missing"' | cut -d'"' -f2)
if [ -n "$MISSING" ]; then
  echo "Missing env vars:"
  echo "$MISSING" | while read -r var; do
    echo "  - $var"
  done
  echo ""
fi

if [ "$STATUS" = "healthy" ]; then
  echo "PASS: All services connected"
  exit 0
else
  echo "DEGRADED: Some services need configuration"
  echo "See docs/DEPLOY-CHECKLIST.md for setup instructions"
  exit 1
fi
