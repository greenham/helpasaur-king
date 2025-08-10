# Uptime Kuma Monitor Configuration

This directory contains configuration and scripts for setting up Uptime Kuma monitoring.

## Setup Method

### Database Import

1. Start Uptime Kuma: `pnpm start` (includes uptime-kuma service)
2. Access dashboard at http://localhost:3013
3. Create your admin account when prompted
4. Go to **Settings** → **Backup** → **Import**
5. Upload the `docker-services.json` file (contains all backend services)
6. Import the environment-specific web app monitor:
   - **Development**: Import `web-app-dev.json` (monitors localhost:3000)
   - **Production**: Import `web-app-prod.json` (monitors helpasaur.com)
7. For production, also import `ssl-monitoring-prod.json` to monitor SSL certificate expiry

## Files

- `docker-services.json` - Monitor definitions for all backend services (same across environments)
- `web-app-dev.json` - Web app monitor for local development (http://host.docker.internal:3000 - accesses host machine from container)
- `web-app-prod.json` - Web app monitor for production (https://helpasaur.com) with SSL certificate monitoring
- `ssl-monitoring-prod.json` - SSL certificate expiry monitoring for additional production HTTPS endpoints (API, RW, Status)

## Tags

Tags help organize monitors. Default tags:

- `internal` - Docker network services
- `external` - Public endpoints
- `api` - API services
- `bot` - Bot services
- `database` - Database services
- `frontend` - Web interfaces
- `infrastructure` - Core services

## Docker Network Access

For local monitoring, services must be on the same Docker network. The compose files handle this automatically.

## Testing

1. Start services with monitoring:

   ```bash
   pnpm start
   ```

2. Access Uptime Kuma at http://localhost:3013

3. Import configuration using one of the methods above

4. Test by stopping a service:

   ```bash
   docker stop helpa-api-server-1
   ```

5. Verify alerts are triggered

## Production Notes

- Uptime Kuma is accessible at https://status.helpasaur.com (configured in nginx)
- Data persists in the `uptime-kuma_data` Docker volume
- The service runs on internal port 3001, exposed on port 3013 (configurable via `UPTIME_KUMA_PORT`)

## SSL Certificate Monitoring

SSL certificate monitoring is split across two files:
- `web-app-prod.json` - Monitors `helpasaur.com` (main website)
- `ssl-monitoring-prod.json` - Monitors additional endpoints:
  - `api.helpasaur.com` - API server
  - `rw.helpasaur.com` - Runner Watcher service
  - `status.helpasaur.com` - Uptime Kuma dashboard

Key features:
- `expiryNotification: true` enables certificate expiry alerts
- Checks run hourly (`interval: 3600` seconds)
- Alerts are sent 7 days before certificate expiry (default)
- Each monitor also verifies the endpoint is accessible
