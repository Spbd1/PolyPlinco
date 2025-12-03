#!/bin/bash

# Auto Health Check Script
# Run this as a cron job every 5 minutes

set -e

LOG_DIR="/var/log/polyplinko"
LOG_FILE="$LOG_DIR/health-check.log"

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Run health check
echo "[$(date)] Running health check..." >> "$LOG_FILE"

cd /opt/polyplinko
node scripts/health-check.ts >> "$LOG_FILE" 2>&1

# Check exit code
if [ $? -ne 0 ]; then
    echo "[$(date)] Health check FAILED" >> "$LOG_FILE"
    # Send alert (integrate with your alerting system)
    # curl -X POST https://hooks.slack.com/... -d "Health check failed"
else
    echo "[$(date)] Health check passed" >> "$LOG_FILE"
fi

# Rotate logs if too large (keep last 10MB)
if [ -f "$LOG_FILE" ] && [ $(stat -f%z "$LOG_FILE" 2>/dev/null || stat -c%s "$LOG_FILE") -gt 10485760 ]; then
    mv "$LOG_FILE" "$LOG_FILE.old"
    echo "[$(date)] Log rotated" > "$LOG_FILE"
fi
