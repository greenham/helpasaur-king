# Monitoring Setup

Helpasaur uses Uptime Kuma as a separate monitoring stack to ensure continuous monitoring even during application deployments.

## Architecture

The monitoring stack runs independently from the main application stack:

- **Separate Docker Compose**: `docker-compose.monitoring.yml`
- **Dedicated Network**: `helpa-monitoring_ext` network
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
pnpm monitor:start

# Or directly with the script
./scripts/monitoring.sh start
```

Access Uptime Kuma at: http://localhost:3013

### Initial Configuration

1. Access dashboard at http://localhost:3013
2. Create your admin account when prompted
3. Go to **Settings** → **Backup** → **Import**
4. Choose the appropriate configuration file for your monitoring needs:
   - `app-services.dev.json` - All services via host.docker.internal (for local development)
   - `app-services.prod.json` - Production services via external URLs (includes SSL monitoring)

## Managing the Stack

### Commands

```bash
# Stop monitoring
pnpm monitor:stop

# Restart monitoring
pnpm monitor:restart

# Check status
pnpm monitor:status

# View logs
pnpm monitor:logs

# Backup data
pnpm monitor:backup

# Restore from backup
./scripts/monitoring.sh restore <backup-file>
```

## Configuration Files

### Monitor Definitions

**Development Monitoring (`app-services.dev.json`):**
All services monitored via host.docker.internal:
- 🔌 API Server (port 3001)
- 💬 Discord Bot (port 3010)
- 📺 Twitch Bot (port 3011)
- 👁️ Runner Watcher (port 3002)
- 🏁 Race Bot (port 3012)
- 🔄 WebSocket Relay (port 3003)
- 🗄️ Mongo Express (port 8081)
- 🌐 Web App (port 3000)

**Production Monitoring (`app-services.prod.json`):**
All services via external URLs (using wildcard *.helpasaur.com DNS):
- 🌐 API Server (https://api.helpasaur.com) - Health check + SSL expiry
- 🌐 Runner Watcher (https://rw.helpasaur.com) - Health check + SSL expiry
- 🌐 Web App (https://helpasaur.com) - Availability + SSL expiry
- 💬 Discord Bot (http://discord.helpasaur.com:3010/health)
- 📺 Twitch Bot (http://twitch.helpasaur.com:3011/health)
- 🏁 Race Bot (http://racebot.helpasaur.com:3012/health)
- 🔄 WebSocket Relay (http://ws.helpasaur.com:3003/health)
- 🗄️ Mongo Express (http://db.helpasaur.com:8081)

### Tags

Tags help organize monitors:

- `Backend` - Backend API services
- `Frontend` - Web interfaces
- `Infrastructure` - Core services (WebSocket relay)
- `Bots` - Discord and Twitch bots
- `Stream` - Stream monitoring services
- `Database` - Database services
- `Critical` - Critical services that need immediate attention
- `Important` - Important but not critical services
- `Standard` - Standard priority services
- `Production` - Production environment monitors

## Production Deployment

### Automatic Management

The monitoring stack is automatically managed during production deployments:

1. **Initial Setup**: First deployment will start the monitoring stack
2. **Subsequent Deploys**: Monitoring stays running during app updates
3. **Manual Control**: SSH to server and use `docker compose -f docker-compose.monitoring.yml` commands

### SSL Certificate Monitoring

SSL monitoring features:

- `expiryNotification: true` enables certificate expiry alerts
- Checks run hourly (`interval: 3600` seconds)
- Alerts sent 7 days before certificate expiry (default)
- Each monitor also verifies endpoint accessibility

## Network Configuration

The monitoring stack runs completely independently:

- **No shared networks** with the main application stack
- **Port exposure**: Direct access via port 3013
- **Host networking**: Uses `host.docker.internal` to monitor services

This provides:

- Complete isolation from application stack
- No dependencies between stacks
- Monitoring can check services via host machine networking

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
   pnpm monitor:start
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

1. Verify host networking:
   ```bash
   docker compose -f docker-compose.monitoring.yml exec uptime-kuma ping host.docker.internal
   ```

### Port Conflicts

Default port is 3013. To change:

```bash
export UPTIME_KUMA_PORT=3014
pnpm monitor:start
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
- Consider firewall rules to restrict access to port 3013 in production
- Regular backups recommended for monitoring configuration
- The service runs on internal port 3001, exposed on port 3013 (configurable via `UPTIME_KUMA_PORT`)
