#!/bin/bash

# Script to clean up old Docker images
# Usage: ./scripts/cleanup.sh [KEEP_COUNT]
# KEEP_COUNT: Number of versions to keep per service (default: 3)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Number of versions to keep (default: 3)
KEEP_COUNT="${1:-3}"

echo -e "${YELLOW}Cleaning up old Docker images (keeping last $KEEP_COUNT versions)...${NC}"

# List of services to clean
SERVICES="api discord twitch runnerwatcher racebot ws-relay base"

for SERVICE in $SERVICES; do
  IMAGE_NAME="ghcr.io/greenham/helpasaur-king/helpa-$SERVICE"
  echo -e "Cleaning ${BLUE}$IMAGE_NAME${NC} images..."
  
  # Find and remove old versions
  OLD_TAGS=$(docker images "$IMAGE_NAME" --format "{{.Tag}}" | grep -E '^[0-9]+\.[0-9]+\.[0-9]+$' | sort -V | head -n -$KEEP_COUNT)
  
  if [ -n "$OLD_TAGS" ]; then
    echo "$OLD_TAGS" | while read TAG; do
      echo "  Removing $IMAGE_NAME:$TAG"
      docker rmi "$IMAGE_NAME:$TAG" || true
    done
  else
    echo "  No old versions to remove"
  fi
done

# Remove dangling images
echo -e "${YELLOW}Removing dangling images...${NC}"
docker image prune -f

echo -e "${GREEN}✓ Docker cleanup complete!${NC}"

# Show disk usage
echo -e "\n${BLUE}Current Docker disk usage:${NC}"
docker system df