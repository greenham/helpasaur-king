# Monitoring Setup Guide

## Initial Setup

### 1. Generate SSL Certificate for status.helpasaur.com

SSH into your production server and run:
```bash
sudo certbot certonly --nginx -d status.helpasaur.com
```

### 2. Deploy the Updated Configuration

From your local machine:
1. Create a new release to trigger the build
2. Run the deploy workflow with the new version

Or manually on the server:
```bash
cd /srv/helpa
# Pull the latest compose files
git pull  # or copy manually

# Start Uptime Kuma
VERSION=latest docker compose -f docker-compose.yml -f docker-compose.ghcr.yml -f docker-compose.prod.yml up -d uptime-kuma

# Reload nginx
docker compose -f docker-compose.yml -f docker-compose.ghcr.yml -f docker-compose.prod.yml restart nginx
```

### 3. Access Uptime Kuma

1. Navigate to https://status.helpasaur.com
2. Create your admin account (first time setup)
3. Save your credentials securely!

## Configure Monitors

Add the following monitors in Uptime Kuma:

### Service Health Checks

| Name | Type | URL | Interval |
|------|------|-----|----------|
| API Server | HTTP(s) | http://api-server:3001/health | 60s |
| Discord Bot | HTTP(s) | http://discord-bot:3010/health | 60s |
| Twitch Bot | HTTP(s) | http://twitch-bot:3011/health | 60s |
| Runner Watcher | HTTP(s) | http://runnerwatcher:3002/health | 60s |
| Race Bot | HTTP(s) | http://racebot:3012/health | 60s |
| WebSocket Relay | HTTP(s) | http://ws-relay:3003/health | 60s |
| MongoDB | TCP Port | mongo:27017 | 60s |
| Mongo Express | HTTP(s) | http://mongo-express:8081 | 60s |

### External Endpoints

| Name | Type | URL | Interval |
|------|------|-----|----------|
| Main Website | HTTP(s) | https://helpasaur.com | 60s |
| API Endpoint | HTTP(s) | https://api.helpasaur.com/health | 60s |
| Runner Watcher | HTTP(s) | https://rw.helpasaur.com/health | 60s |

### SSL Certificate Monitoring

| Name | Type | URL | Interval | Certificate Expiry |
|------|------|-----|----------|-------------------|
| Main Site SSL | HTTP(s) | https://helpasaur.com | 3600s | 7 days |
| API SSL | HTTP(s) | https://api.helpasaur.com | 3600s | 7 days |
| RW SSL | HTTP(s) | https://rw.helpasaur.com | 3600s | 7 days |
| Status SSL | HTTP(s) | https://status.helpasaur.com | 3600s | 7 days |

## Configure Notifications

### Discord Webhook (Recommended)
1. Create a webhook in your Discord server admin channel
2. In Uptime Kuma: Settings → Notifications → Add Notification
3. Select "Discord Webhook"
4. Paste your webhook URL
5. Test the notification

### Email (Optional)
1. Settings → Notifications → Add Notification
2. Select "Email (SMTP)"
3. Configure your SMTP settings

### Telegram (Optional)
1. Create a bot with @BotFather
2. Get your chat ID
3. Configure in Uptime Kuma

## Alert Rules

Configure these default notification triggers:
- **Down** → Send notification immediately
- **Up** → Send recovery notification
- **Certificate Expiry** → 7 days before expiration

## Status Page (Optional)

Create a public status page:
1. Status Pages → Add New Status Page
2. Name: "Helpasaur Status"
3. Add all external monitors
4. Set to public or password protected
5. Custom domain: status.helpasaur.com/status

## Maintenance

### Backup Uptime Kuma Data
The data is stored in the `uptime-kuma_data` Docker volume. To backup:
```bash
docker run --rm -v uptime-kuma_data:/data -v $(pwd):/backup alpine tar czf /backup/uptime-kuma-backup.tar.gz -C /data .
```

### Update Uptime Kuma
```bash
docker compose -f docker-compose.yml -f docker-compose.ghcr.yml -f docker-compose.prod.yml pull uptime-kuma
docker compose -f docker-compose.yml -f docker-compose.ghcr.yml -f docker-compose.prod.yml up -d uptime-kuma
```

## Troubleshooting

### Can't access status.helpasaur.com
1. Check DNS is pointing to your server
2. Verify SSL certificate was created
3. Check nginx logs: `docker logs helpa-nginx-1`

### Monitors showing as down
1. Verify services are on the same Docker network
2. Use container names, not localhost
3. Check firewall rules aren't blocking internal traffic

### WebSocket connection issues
1. Ensure nginx proxy headers are set correctly
2. Check browser console for errors
3. Verify port 3013 is accessible