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
NC='\033[0m' # No Color

case "$1" in
    start)
        echo -e "${GREEN}Starting monitoring stack...${NC}"
        docker compose -f "$COMPOSE_FILE" up -d
        echo -e "${GREEN}Monitoring stack started!${NC}"
        echo "Access Uptime Kuma at: http://localhost:${UPTIME_KUMA_PORT:-3013}"
        ;;
    
    stop)
        echo -e "${YELLOW}Stopping monitoring stack...${NC}"
        docker compose -f "$COMPOSE_FILE" down
        echo -e "${GREEN}Monitoring stack stopped!${NC}"
        ;;
    
    restart)
        echo -e "${YELLOW}Restarting monitoring stack...${NC}"
        docker compose -f "$COMPOSE_FILE" restart
        echo -e "${GREEN}Monitoring stack restarted!${NC}"
        ;;
    
    status)
        echo -e "${GREEN}Monitoring stack status:${NC}"
        docker compose -f "$COMPOSE_FILE" ps
        ;;
    
    logs)
        shift
        docker compose -f "$COMPOSE_FILE" logs "$@"
        ;;
    
    pull)
        echo -e "${GREEN}Pulling latest monitoring images...${NC}"
        docker compose -f "$COMPOSE_FILE" pull
        echo -e "${GREEN}Images updated!${NC}"
        ;;
    
    backup)
        echo -e "${GREEN}Backing up Uptime Kuma data...${NC}"
        BACKUP_DIR="${PROJECT_ROOT}/backups/monitoring"
        mkdir -p "$BACKUP_DIR"
        TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
        BACKUP_FILE="$BACKUP_DIR/uptime-kuma_${TIMESTAMP}.tar.gz"
        
        # Create backup of the volume
        docker run --rm -v uptime-kuma_data:/data -v "$BACKUP_DIR":/backup \
            alpine tar czf "/backup/uptime-kuma_${TIMESTAMP}.tar.gz" -C /data .
        
        echo -e "${GREEN}Backup created: $BACKUP_FILE${NC}"
        
        # Keep only last 5 backups
        ls -t "$BACKUP_DIR"/uptime-kuma_*.tar.gz | tail -n +6 | xargs -r rm
        echo "Kept last 5 backups"
        ;;
    
    restore)
        if [ -z "$2" ]; then
            echo -e "${RED}Please provide backup file path${NC}"
            echo "Usage: $0 restore <backup-file>"
            exit 1
        fi
        
        if [ ! -f "$2" ]; then
            echo -e "${RED}Backup file not found: $2${NC}"
            exit 1
        fi
        
        echo -e "${YELLOW}WARNING: This will replace current monitoring data!${NC}"
        read -p "Continue? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "Restore cancelled"
            exit 0
        fi
        
        echo -e "${GREEN}Restoring from backup...${NC}"
        
        # Stop monitoring stack
        docker compose -f "$COMPOSE_FILE" down
        
        # Restore the volume
        docker run --rm -v uptime-kuma_data:/data -v "$(dirname "$2")":/backup \
            alpine sh -c "rm -rf /data/* && tar xzf /backup/$(basename "$2") -C /data"
        
        # Start monitoring stack
        docker compose -f "$COMPOSE_FILE" up -d
        
        echo -e "${GREEN}Restore completed!${NC}"
        ;;
    
    *)
        echo "Usage: $0 {start|stop|restart|status|logs|pull|backup|restore}"
        echo ""
        echo "Commands:"
        echo "  start    - Start the monitoring stack"
        echo "  stop     - Stop the monitoring stack"
        echo "  restart  - Restart the monitoring stack"
        echo "  status   - Show monitoring stack status"
        echo "  logs     - View monitoring stack logs"
        echo "  pull     - Pull latest images"
        echo "  backup   - Backup Uptime Kuma data"
        echo "  restore  - Restore Uptime Kuma data from backup"
        exit 1
        ;;
esac