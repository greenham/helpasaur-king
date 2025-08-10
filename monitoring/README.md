# Uptime Kuma Monitor Configuration

This directory contains configuration and scripts for setting up Uptime Kuma monitoring.

## Quick Setup Methods

### Method 1: Database Import (Easiest)

1. Start Uptime Kuma and create your admin account
2. Go to **Settings** → **Backup** → **Import**
3. Upload the `uptime-kuma-backup.json` file
4. All monitors, tags, and settings will be imported

### Method 2: API Script (Automated)

1. Install dependencies:
   ```bash
   cd monitoring
   npm install axios socket.io-client
   ```

2. Run the setup script:
   ```bash
   # For local development
   node setup-monitors.js http://localhost:3013 admin yourpassword
   
   # For production
   node setup-monitors.js https://status.helpasaur.com admin yourpassword
   ```

### Method 3: Manual Configuration

Use the `monitors-config.json` as a reference to manually create monitors in the UI.

## Files

- `monitors-config.json` - Monitor definitions for all services
- `setup-monitors.js` - Automated setup script using the API
- `uptime-kuma-backup.json` - Full database export (created after initial setup)

## Creating a Backup

After setting up your monitors, create a backup for easy restoration:

1. Go to **Settings** → **Backup** → **Export**
2. Select "Export Backup" 
3. Save as `uptime-kuma-backup.json` in this directory
4. Commit to repository (passwords are hashed)

## Customizing Monitors

Edit `monitors-config.json` to add/modify monitors. Each monitor supports:

```json
{
  "name": "Service Name",
  "type": "http|port|ping|keyword",
  "url": "http://service:port/health",
  "interval": 60,
  "retryInterval": 60,
  "maxretries": 3,
  "accepted_statuscodes": ["200"],
  "tags": ["internal", "api"]
}
```

## Tags

Tags help organize monitors. Default tags:
- `internal` - Docker network services
- `external` - Public endpoints
- `api` - API services
- `bot` - Bot services
- `database` - Database services
- `frontend` - Web interfaces
- `infrastructure` - Core services

## Notifications

Add your Discord webhook URL to `monitors-config.json`:

```json
"notifications": [
  {
    "name": "Discord Alerts",
    "type": "discord",
    "discordWebhookUrl": "https://discord.com/api/webhooks/..."
  }
]
```

## Docker Network Access

For local monitoring, services must be on the same Docker network. The compose files handle this automatically.

## Testing

1. Start monitoring locally:
   ```bash
   pnpm monitoring:start
   ```

2. Access at http://localhost:3013

3. Import configuration using one of the methods above

4. Test by stopping a service:
   ```bash
   docker stop helpa-api-server-1
   ```

5. Verify alerts are triggered