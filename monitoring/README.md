# Monitoring Setup (Local Development)

Helpasaur uses Uptime Kuma for monitoring, running locally on your development machine to monitor production services externally.

## Architecture

The monitoring stack runs locally, separate from production:

- **Local Docker Compose**: `docker-compose.monitoring.yml`
- **External Monitoring**: Monitors production via public URLs and health endpoints
- **Port**: Runs on port 3333 locally
- **Data Persistence**: `uptime-kuma_data` Docker volume

## Benefits of Local Monitoring

1. **No Production Resources**: Doesn't consume production server resources
2. **True External Monitoring**: Tests services as external users would access them
3. **Independent from Deployment**: Not affected by production deployments
4. **Easy Management**: Run and configure from your local development environment

## Quick Start

### Starting the Monitoring Stack

```bash
# Start monitoring locally
pnpm monitor:start
```

Access Uptime Kuma at: http://localhost:3333

### Initial Configuration

1. Access dashboard at http://localhost:3333
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

### Configuration Generator

To maintain consistency between development and production monitoring configurations, use the generator script:

```bash
# Generate both dev and prod configurations
node monitoring/generate-configs.js
```

This creates:

- `app-services.dev.json` - Development configuration (host.docker.internal)
- `app-services.prod.json` - Production configuration (external URLs with SSL monitoring)

The generator uses a common template defined in `generate-configs.js` to ensure:

- Consistent service definitions across environments
- Proper JSON-query type for health endpoints
- Environment-specific URLs and settings
- Automatic SSL monitoring for HTTPS endpoints in production

To modify monitored services, edit the `SERVICES` array in `generate-configs.js` and regenerate.

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
All services via external URLs (using wildcard \*.helpasaur.com DNS):

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
- **Port exposure**: Direct access via port 3333
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

2. Access Uptime Kuma at http://localhost:3333

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

Default port is 3333. To change:

```bash
export UPTIME_KUMA_PORT=3334
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
- Consider firewall rules to restrict access to port 3333 in production
- Regular backups recommended for monitoring configuration
- The service runs on internal port 3001, exposed on port 3333 (configurable via `UPTIME_KUMA_PORT`)
