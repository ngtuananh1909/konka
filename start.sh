#!/bin/bash
set -e

FRONTEND_PORT=${FRONTEND_PORT:-8080}
REVIEW_SERVER_HOST=${REVIEW_SERVER_HOST:-127.0.0.1}
REVIEW_SERVER_PORT=${REVIEW_SERVER_PORT:-8787}

python3 -m http.server "$FRONTEND_PORT" &
FRONTEND_PID=$!

npm run review-server &
REVIEW_PID=$!

cleanup() {
  kill "$FRONTEND_PID" "$REVIEW_PID" 2>/dev/null || true
}

trap cleanup EXIT INT TERM

echo "Frontend static server running at http://127.0.0.1:$FRONTEND_PORT"
echo "Review server running at http://$REVIEW_SERVER_HOST:$REVIEW_SERVER_PORT"
echo "Health: http://$REVIEW_SERVER_HOST:$REVIEW_SERVER_PORT/health"
echo "Provider probe: http://$REVIEW_SERVER_HOST:$REVIEW_SERVER_PORT/health/provider"
echo "Press Ctrl+C to stop both processes"

wait