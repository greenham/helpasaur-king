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

# Pull the new images from ghcr.io
echo -e "\n${YELLOW}📦 Pulling images from GitHub Container Registry...${NC}"
if VERSION=$VERSION docker compose -f docker-compose.yml -f docker-compose.ghcr.yml -f docker-compose.prod.yml pull; then
  echo -e "${GREEN}   ✓ Images pulled successfully${NC}"
else
  echo -e "${RED}   ❌ Failed to pull images${NC}"
  exit 1
fi

# Start production services with version-tagged images
echo -e "\n${YELLOW}🔄 Starting services with --force-recreate...${NC}"
if VERSION=$VERSION docker compose -f docker-compose.yml -f docker-compose.ghcr.yml -f docker-compose.prod.yml up -d --force-recreate; then
  echo -e "${GREEN}   ✓ Services started successfully${NC}"
else
  echo -e "${RED}   ❌ Failed to start services${NC}"
  exit 1
fi

echo -e "\n${GREEN}${BOLD}✅ Deployment complete!${NC}"
echo -e "${CYAN}📊 Check status with: ${YELLOW}docker compose ps${NC}"
echo -e "${CYAN}📝 View logs with: ${YELLOW}docker compose logs -f${NC}\n"