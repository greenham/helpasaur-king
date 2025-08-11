#!/bin/bash

# Script to manage the monitoring stack separately from the main application
# Usage: ./scripts/monitoring.sh [start|stop|restart|status|logs]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="docker-compose.monitoring.yml"

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

case "$1" in
    start)
        echo -e "\n${BOLD}${BLUE}🔍 Starting Monitoring Stack${NC}"
        echo -e "${CYAN}└─ Uptime Kuma monitoring service${NC}\n"
        
        echo -e "${YELLOW}⚡ Starting services...${NC}"
        if docker compose -f "$COMPOSE_FILE" up -d; then
            echo -e "${GREEN}✅ Monitoring stack started successfully!${NC}"
            echo -e "\n${CYAN}📊 Access Uptime Kuma at: ${BOLD}http://localhost:${UPTIME_KUMA_PORT:-3333}${NC}\n"
        else
            echo -e "${RED}❌ Failed to start monitoring stack${NC}"
            exit 1
        fi
        ;;
    
    stop)
        echo -e "\n${BOLD}${YELLOW}⏹️  Stopping Monitoring Stack${NC}\n"
        if docker compose -f "$COMPOSE_FILE" down; then
            echo -e "${GREEN}✅ Monitoring stack stopped successfully!${NC}\n"
        else
            echo -e "${RED}❌ Failed to stop monitoring stack${NC}"
            exit 1
        fi
        ;;
    
    restart)
        echo -e "\n${BOLD}${YELLOW}🔄 Restarting Monitoring Stack${NC}\n"
        if docker compose -f "$COMPOSE_FILE" restart; then
            echo -e "${GREEN}✅ Monitoring stack restarted successfully!${NC}\n"
        else
            echo -e "${RED}❌ Failed to restart monitoring stack${NC}"
            exit 1
        fi
        ;;
    
    status)
        echo -e "\n${BOLD}${BLUE}📊 Monitoring Stack Status${NC}"
        echo -e "${DIM}────────────────────────────────────${NC}"
        docker compose -f "$COMPOSE_FILE" ps
        echo -e "${DIM}────────────────────────────────────${NC}\n"
        ;;
    
    logs)
        shift
        echo -e "\n${BOLD}${BLUE}📝 Monitoring Stack Logs${NC}\n"
        docker compose -f "$COMPOSE_FILE" logs "$@"
        ;;
    
    pull)
        echo -e "\n${BOLD}${BLUE}📦 Updating Monitoring Images${NC}\n"
        echo -e "${YELLOW}⬇️  Pulling latest images...${NC}"
        if docker compose -f "$COMPOSE_FILE" pull; then
            echo -e "${GREEN}✅ Images updated successfully!${NC}\n"
        else
            echo -e "${RED}❌ Failed to update images${NC}"
            exit 1
        fi
        ;;
    
    backup)
        echo -e "\n${BOLD}${BLUE}💾 Backing Up Monitoring Data${NC}\n"
        BACKUP_DIR="${PROJECT_ROOT}/backups/monitoring"
        mkdir -p "$BACKUP_DIR"
        TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
        BACKUP_FILE="$BACKUP_DIR/uptime-kuma_${TIMESTAMP}.tar.gz"
        
        echo -e "${YELLOW}📦 Creating backup...${NC}"
        # Create backup of the volume
        if docker run --rm -v uptime-kuma_data:/data -v "$BACKUP_DIR":/backup \
            alpine tar czf "/backup/uptime-kuma_${TIMESTAMP}.tar.gz" -C /data .; then
            echo -e "${GREEN}✅ Backup created: ${BOLD}$BACKUP_FILE${NC}"
        else
            echo -e "${RED}❌ Failed to create backup${NC}"
            exit 1
        fi
        
        # Keep only last 5 backups
        echo -e "${YELLOW}🧹 Cleaning old backups...${NC}"
        ls -t "$BACKUP_DIR"/uptime-kuma_*.tar.gz | tail -n +6 | xargs -r rm
        echo -e "${GREEN}✅ Kept last 5 backups${NC}\n"
        ;;
    
    restore)
        if [ -z "$2" ]; then
            echo -e "\n${RED}❌ Please provide backup file path${NC}"
            echo -e "${CYAN}Usage: $0 restore <backup-file>${NC}\n"
            exit 1
        fi
        
        BACKUP_FILE="$2"
        if [ ! -f "$BACKUP_FILE" ]; then
            echo -e "\n${RED}❌ Backup file not found: $BACKUP_FILE${NC}\n"
            exit 1
        fi
        
        echo -e "\n${BOLD}${BLUE}📥 Restore Monitoring Data${NC}"
        echo -e "${CYAN}├─ Source: ${BOLD}$BACKUP_FILE${NC}"
        echo -e "${CYAN}└─ Target: Uptime Kuma volume${NC}\n"
        
        echo -e "${RED}⚠️  WARNING: This will overwrite current monitoring data!${NC}"
        read -p "$(echo -e ${YELLOW}Continue? [y/N]: ${NC})" -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${YELLOW}✗ Restore cancelled${NC}\n"
            exit 0
        fi
        
        # Stop monitoring stack
        echo -e "\n${YELLOW}⏹️  Stopping monitoring stack...${NC}"
        docker compose -f "$COMPOSE_FILE" down
        
        # Restore the backup
        echo -e "${YELLOW}📥 Restoring backup...${NC}"
        if docker run --rm -v uptime-kuma_data:/data -v "$(dirname "$BACKUP_FILE")":/backup \
            alpine sh -c "rm -rf /data/* && tar xzf /backup/$(basename "$BACKUP_FILE") -C /data"; then
            echo -e "${GREEN}✅ Data restored successfully${NC}"
        else
            echo -e "${RED}❌ Failed to restore backup${NC}"
            exit 1
        fi
        
        # Start monitoring stack
        echo -e "${YELLOW}⚡ Starting monitoring stack...${NC}"
        docker compose -f "$COMPOSE_FILE" up -d
        
        echo -e "\n${GREEN}${BOLD}✅ Restore complete!${NC}\n"
        ;;
    
    *)
        echo -e "\n${BOLD}${BLUE}🔍 Monitoring Stack Manager${NC}"
        echo -e "${DIM}────────────────────────────────────${NC}"
        echo -e "${CYAN}Usage: ${BOLD}$0 {command} [options]${NC}\n"
        echo -e "${BOLD}Commands:${NC}"
        echo -e "  ${GREEN}start${NC}    - Start the monitoring stack"
        echo -e "  ${YELLOW}stop${NC}     - Stop the monitoring stack"
        echo -e "  ${YELLOW}restart${NC}  - Restart the monitoring stack"
        echo -e "  ${BLUE}status${NC}   - Show monitoring stack status"
        echo -e "  ${BLUE}logs${NC}     - View monitoring logs"
        echo -e "  ${CYAN}pull${NC}     - Pull latest monitoring images"
        echo -e "  ${MAGENTA}backup${NC}   - Create backup of monitoring data"
        echo -e "  ${MAGENTA}restore${NC}  - Restore monitoring data from backup"
        echo -e "\n${DIM}Example: $0 start${NC}\n"
        exit 1
        ;;
esac