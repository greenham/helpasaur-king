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
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m' # No Color

# Number of versions to keep (default: 3)
KEEP_COUNT="${1:-3}"

echo -e "\n${BOLD}${BLUE}🧹 Docker Image Cleanup${NC}"
echo -e "${CYAN}├─ Keep Count: ${BOLD}$KEEP_COUNT${NC} versions per service"
echo -e "${CYAN}└─ Path: $PROJECT_ROOT${NC}\n"

# List of services to clean
SERVICES="api discord twitch runnerwatcher racebot ws-relay base"
TOTAL_REMOVED=0
SPACE_FREED=0

echo -e "${YELLOW}🔍 Scanning for old images...${NC}\n"

for SERVICE in $SERVICES; do
  IMAGE_NAME="ghcr.io/greenham/helpasaur-king/helpa-$SERVICE"
  echo -e "${CYAN}📦 Service: ${BOLD}$SERVICE${NC}"
  
  # Find and remove old versions
  OLD_TAGS=$(docker images "$IMAGE_NAME" --format "{{.Tag}}" | grep -E '^[0-9]+\.[0-9]+\.[0-9]+$' | sort -V | head -n -$KEEP_COUNT || true)
  
  if [ -n "$OLD_TAGS" ]; then
    COUNT=$(echo "$OLD_TAGS" | wc -l)
    echo -e "${YELLOW}   Found $COUNT old version(s) to remove${NC}"
    echo "$OLD_TAGS" | while read TAG; do
      # Get image size before removal
      SIZE=$(docker images "$IMAGE_NAME:$TAG" --format "{{.Size}}" || echo "0")
      echo -e "${DIM}   ├─ Removing $IMAGE_NAME:$TAG ($SIZE)${NC}"
      if docker rmi "$IMAGE_NAME:$TAG" 2>/dev/null; then
        echo -e "${GREEN}   │  ✓ Removed successfully${NC}"
        ((TOTAL_REMOVED++)) || true
      else
        echo -e "${RED}   │  ✗ Failed to remove (may be in use)${NC}"
      fi
    done
    echo -e "${DIM}   └─ Done${NC}"
  else
    echo -e "${GREEN}   ✓ No old versions to remove${NC}"
  fi
  echo
done

# Remove dangling images
echo -e "${YELLOW}🔧 Removing dangling images...${NC}"
DANGLING_COUNT=$(docker images -f "dangling=true" -q | wc -l)
if [ "$DANGLING_COUNT" -gt 0 ]; then
  echo -e "${CYAN}   Found $DANGLING_COUNT dangling image(s)${NC}"
  docker image prune -f
  echo -e "${GREEN}   ✓ Dangling images removed${NC}"
else
  echo -e "${GREEN}   ✓ No dangling images found${NC}"
fi

echo -e "\n${GREEN}${BOLD}✅ Cleanup complete!${NC}"

# Show disk usage with better formatting
echo -e "\n${BOLD}${BLUE}💾 Docker Disk Usage${NC}"
echo -e "${DIM}────────────────────────────────────${NC}"
docker system df | while IFS= read -r line; do
  if [[ $line == TYPE* ]]; then
    echo -e "${BOLD}${CYAN}$line${NC}"
  elif [[ $line == *"GB"* ]] || [[ $line == *"MB"* ]]; then
    echo -e "${YELLOW}$line${NC}"
  else
    echo "$line"
  fi
done
echo -e "${DIM}────────────────────────────────────${NC}\n"