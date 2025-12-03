#!/bin/bash

# Backup all game events to JSON file
# Run this script regularly (e.g., daily via cron)

BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OUTPUT_FILE="$BACKUP_DIR/events_$TIMESTAMP.json"

mkdir -p "$BACKUP_DIR"

echo "📦 Backing up contract events..."

# Use ethers.js or cast to fetch events
cast logs \
  --rpc-url $POLYGON_RPC_URL \
  --address $NEXT_PUBLIC_GAME_CONTRACT_ADDRESS \
  --from-block 0 \
  --to-block latest \
  > "$OUTPUT_FILE"

echo "✅ Backup complete: $OUTPUT_FILE"

# Keep only last 30 days of backups
find "$BACKUP_DIR" -name "events_*.json" -mtime +30 -delete

echo "🧹 Cleaned old backups"
