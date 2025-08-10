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
NC='\033[0m' # No Color

# Get version from argument or use latest
VERSION="${1:-latest}"
VERSION="${VERSION#v}"  # Remove 'v' prefix if present

echo -e "${BLUE}Deploying Helpasaur King version: $VERSION${NC}"

# Ensure .env file exists
if [ ! -f .env ]; then
  echo -e "${RED}ERROR: .env file not found in $PROJECT_ROOT${NC}"
  echo "Please ensure .env file with runtime variables is present"
  exit 1
fi

# Pull the new images from ghcr.io
echo -e "${YELLOW}Pulling images from GitHub Container Registry...${NC}"
VERSION=$VERSION docker compose -f docker-compose.yml -f docker-compose.ghcr.yml -f docker-compose.prod.yml pull

# Start production services with version-tagged images
echo -e "${GREEN}Starting services with --force-recreate to ensure new images are used...${NC}"
VERSION=$VERSION docker compose -f docker-compose.yml -f docker-compose.ghcr.yml -f docker-compose.prod.yml up -d --force-recreate

echo -e "${GREEN}✓ Deployment complete!${NC}"
echo -e "Services are starting up. Check status with: ${YELLOW}docker compose ps${NC}"