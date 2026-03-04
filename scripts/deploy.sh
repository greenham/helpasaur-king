#!/bin/bash

# Script to deploy the production application stack
# Usage: ./scripts/deploy.sh [VERSION]
# If VERSION is not provided, uses "latest"

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
NC='\033[0m' # No Color

# Get version from argument or use latest
VERSION="${1:-latest}"
VERSION="${VERSION#v}"  # Remove 'v' prefix if present

echo -e "\n${BOLD}${BLUE}🚀 Deploying Helpasaur King${NC}"
echo -e "${CYAN}├─ Version: ${BOLD}$VERSION${NC}"
echo -e "${CYAN}└─ Path: $PROJECT_ROOT${NC}\n"

# Ensure .env file exists
echo -e "${YELLOW}📋 Checking prerequisites...${NC}"
if [ ! -f .env ]; then
  echo -e "${RED}❌ ERROR: .env file not found in $PROJECT_ROOT${NC}"
  echo -e "${RED}   Please ensure .env file with runtime variables is present${NC}"
  exit 1
fi
echo -e "${GREEN}   ✓ .env file found${NC}"

# Clean up old images to free resources before pulling
echo -e "\n${YELLOW}🧹 Pruning unused Docker images...${NC}"
if docker image prune -f > /dev/null 2>&1; then
  echo -e "${GREEN}   ✓ Pruned unused images${NC}"
fi

# Pull new images one at a time to avoid CPU spikes
COMPOSE_CMD="VERSION=$VERSION docker compose -f docker-compose.yml -f docker-compose.prod.yml"
SERVICES=$(eval $COMPOSE_CMD config --services)
echo -e "\n${YELLOW}📦 Pulling images from GitHub Container Registry...${NC}"
for SERVICE in $SERVICES; do
  echo -e "${CYAN}   ↓ Pulling $SERVICE...${NC}"
  if eval $COMPOSE_CMD pull "$SERVICE" 2>/dev/null; then
    echo -e "${GREEN}   ✓ $SERVICE${NC}"
  else
    echo -e "${YELLOW}   ⊘ $SERVICE (using existing image)${NC}"
  fi
done
echo -e "${GREEN}   ✓ All images ready${NC}"

# Start production services with version-tagged images
echo -e "\n${YELLOW}🔄 Starting services with --force-recreate...${NC}"
if VERSION=$VERSION docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --force-recreate; then
  echo -e "${GREEN}   ✓ Services started successfully${NC}"
else
  echo -e "${RED}   ❌ Failed to start services${NC}"
  exit 1
fi

echo -e "\n${GREEN}${BOLD}✅ Deployment complete!${NC}"
echo -e "${CYAN}📊 Check status with: ${YELLOW}docker compose ps${NC}"
echo -e "${CYAN}📝 View logs with: ${YELLOW}docker compose logs -f${NC}\n"