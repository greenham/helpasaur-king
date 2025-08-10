# Monitoring Setup

Helpasaur uses Uptime Kuma as a separate monitoring stack to ensure continuous monitoring even during application deployments.

## Architecture

The monitoring stack runs independently from the main application stack:

- **Separate Docker Compose**: `docker-compose.monitoring.yml`
- **Dedicated Network**: `helpasaur_monitoring` network
- **Independent Lifecycle**: Can be started, stopped, and updated separately
- **Data Persistence**: `uptime-kuma_data` Docker volume

## Benefits of Separation

1. **Continuous Monitoring**: Monitoring stays up during app deployments
2. **Resource Isolation**: Doesn't compete with app services for resources
3. **Independent Updates**: Can update monitoring without touching the app
4. **Better Reliability**: Monitoring can alert on deployment issues

## Quick Start

### Starting the Monitoring Stack

```bash
# Using pnpm scripts
pnpm monitoring:start

# Or directly with the script
./scripts/monitoring.sh start
```

Access Uptime Kuma at: http://localhost:3013

### Initial Configuration

1. Access dashboard at http://localhost:3013
2. Create your admin account when prompted
3. Go to **Settings** → **Backup** → **Import**
4. Upload the configuration files from this directory:
   - `docker-services.json` - All backend service monitors
   - **Development**: `web-app-dev.json` (monitors localhost:3000)
   - **Production**: `web-app-prod.json` (monitors helpasaur.com)
   - **Production SSL**: `ssl-monitoring-prod.json` (certificate expiry)

## Managing the Stack

### Commands

```bash
# Stop monitoring
pnpm monitoring:stop

# Restart monitoring
pnpm monitoring:restart

# Check status
pnpm monitoring:status

# View logs
pnpm monitoring:logs

# Backup data
pnpm monitoring:backup

# Restore from backup
./scripts/monitoring.sh restore <backup-file>
```

## Configuration Files

### Monitor Definitions

- `docker-services.json` - Monitor definitions for all backend services (same across environments)
- `web-app-dev.json` - Web app monitor for local development (http://host.docker.internal:3000)
- `web-app-prod.json` - Web app monitor for production (https://helpasaur.com) with SSL monitoring
- `ssl-monitoring-prod.json` - SSL certificate expiry monitoring for production endpoints:
  - `api.helpasaur.com` - API server
  - `rw.helpasaur.com` - Runner Watcher service
  - `status.helpasaur.com` - Uptime Kuma dashboard

### Tags

Tags help organize monitors:

- `internal` - Docker network services
- `external` - Public endpoints
- `api` - API services
- `bot` - Bot services
- `database` - Database services
- `frontend` - Web interfaces
- `infrastructure` - Core services

## Production Deployment

### Automatic Management

The monitoring stack is automatically managed during production deployments:

1. **Initial Setup**: First deployment will start the monitoring stack
2. **Subsequent Deploys**: Monitoring stays running during app updates
3. **Manual Control**: SSH to server and use `docker compose -f docker-compose.monitoring.yml` commands

### Production URLs

- Monitoring Dashboard: https://status.helpasaur.com

### SSL Certificate Monitoring

SSL monitoring features:
- `expiryNotification: true` enables certificate expiry alerts
- Checks run hourly (`interval: 3600` seconds)
- Alerts sent 7 days before certificate expiry (default)
- Each monitor also verifies endpoint accessibility

## Network Configuration

The monitoring stack uses a dedicated network that bridges with the main application:

- **Network Name**: `helpasaur_monitoring`
- **Type**: Bridge network
- **Shared With**: Nginx (for reverse proxy)

This allows:
- Nginx to proxy requests to Uptime Kuma
- Monitoring to check internal services via host networking
- Isolation from application's internal network

## Backup and Restore

### Creating Backups

```bash
# Automated backup (keeps last 5)
pnpm monitoring:backup

# Manual backup location
./backups/monitoring/uptime-kuma_YYYYMMDD_HHMMSS.tar.gz
```

### Restoring from Backup

```bash
./scripts/monitoring.sh restore ./backups/monitoring/uptime-kuma_20250810_120000.tar.gz
```

## Testing

1. Start services with monitoring:
   ```bash
   pnpm monitoring:start
   pnpm start
   ```

2. Access Uptime Kuma at http://localhost:3013

3. Import configuration files (see Initial Configuration)

4. Test by stopping a service:
   ```bash
   docker stop helpa-api-server-1
   ```

5. Verify alerts are triggered

## Troubleshooting

### Monitoring Can't Reach Services

If monitoring can't reach application services:

1. Ensure the monitoring network exists:
   ```bash
   docker network ls | grep monitoring
   ```

2. Check nginx has access to monitoring network:
   ```bash
   docker inspect nginx | grep -A 5 Networks
   ```

3. Verify host networking:
   ```bash
   docker compose -f docker-compose.monitoring.yml exec uptime-kuma ping host.docker.internal
   ```

### Port Conflicts

Default port is 3013. To change:

```bash
export UPTIME_KUMA_PORT=3014
pnpm monitoring:start
```

### Monitoring Not Starting on Deploy

Check deployment logs for monitoring section:
```
Checking monitoring stack...
Starting monitoring stack...
```

If issues persist, SSH to server and manually start:
```bash
cd /path/to/deployment
docker compose -f docker-compose.monitoring.yml up -d
```

## Migration from Integrated Stack

If you have an existing integrated Uptime Kuma setup:

1. **Backup existing data**:
   ```bash
   docker run --rm -v helpasaur-king_uptime-kuma_data:/data -v $(pwd):/backup \
     alpine tar czf /backup/uptime-backup.tar.gz -C /data .
   ```

2. **Stop main stack**:
   ```bash
   docker compose down
   ```

3. **Start new monitoring stack**:
   ```bash
   docker compose -f docker-compose.monitoring.yml up -d
   ```

4. **Restore data**:
   ```bash
   ./scripts/monitoring.sh restore ./uptime-backup.tar.gz
   ```

5. **Start main stack without monitoring**:
   ```bash
   docker compose up -d
   ```

## Security Considerations

- Monitoring dashboard should be password protected (configured in Uptime Kuma)
- SSL certificates required for production (handled by nginx)
- Consider IP whitelisting for status.helpasaur.com if needed
- Regular backups recommended for monitoring configuration
- The service runs on internal port 3001, exposed on port 3013 (configurable via `UPTIME_KUMA_PORT`)