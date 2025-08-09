# GitHub Container Registry Setup

This project now uses GitHub Container Registry (ghcr.io) to store and distribute Docker images.

## How it Works

1. **Build Phase**: When a release is published on GitHub, the `build-and-push.yml` workflow automatically builds all Docker images and pushes them to ghcr.io with the release version tag
2. **Deploy Phase**: Manual trigger of `deploy-to-prod.yml` workflow to deploy a specific version to production (the server pulls pre-built images from ghcr.io)
3. **Cleanup**: Old image versions are automatically cleaned up on the production server, keeping only the last 3 versions

## Required GitHub Secrets

Make sure these secrets are set in your repository settings (Settings → Secrets and variables → Actions):

### Deployment Secrets:
- `DROPLET_IP` - Your DigitalOcean droplet IP address
- `DROPLET_USER` - SSH user for deployment (usually `root` or a sudo user)
- `DROPLET_SSH_KEY` - Private SSH key for accessing the droplet
- `DEPLOY_PATH` - Path on the server where the application is deployed (e.g., `/srv/helpa`)

### Build Secrets:
- `API_HOST` - The API host URL (e.g., `https://api.helpasaur.com`)
- `TWITCH_APP_CLIENT_ID` - Your Twitch application client ID

## Image Naming Convention

All images are published to:
```
ghcr.io/greenham/helpasaur-king/helpa-<service>:<version>
```

For example:
- `ghcr.io/greenham/helpasaur-king/helpa-api:1.9.1`
- `ghcr.io/greenham/helpasaur-king/helpa-web:latest`

## Viewing Published Images

You can view all published container images at:
https://github.com/greenham/helpasaur-king/packages

## Benefits

1. **No build tools needed on production** - The server only needs Docker
2. **Faster deployments** - Images are pre-built and just need to be pulled
3. **Better security** - Production server doesn't need source code or build dependencies
4. **Version history** - All versions are stored in the registry
5. **Rollback capability** - Can easily switch to a previous version if needed

## Production Server Setup

The production server only needs (in the deployment path):
- `docker-compose.yml` - Base Docker configuration
- `docker-compose.prod.yml` - Production overrides with ghcr.io image references
- `.env` - Runtime environment variables (NOT in git, managed separately)
- `nginx/` - Nginx configuration files
- `mongo-backup` - MongoDB backup script (for cron jobs)
- `renew-certs` - SSL certificate renewal script (for cron jobs)
- `docker-entrypoint-initdb.d/` - MongoDB init scripts (only for initial setup, not deployed via CI)

**No source code or build files are needed on production!**

## Important: Data Persistence

**Your MongoDB data is safe during the migration!** The `mongodb_data_container` volume is a Docker named volume that persists independently of container recreations. When switching from locally-built images to ghcr.io images:

- MongoDB uses the same `mongo:7-jammy` image (not changing)
- The named volume `mongodb_data_container` remains intact
- All data in `/data/db` inside the container is preserved
- Even if MongoDB container restarts, it reconnects to the same volume

## Deployment Workflow

### Automatic Build on Release
When you publish a new release on GitHub:
1. The `build-and-push.yml` workflow automatically triggers
2. All Docker images are built and pushed to ghcr.io with the version tag
3. Images are tagged with both the version number and `latest`

### Manual Production Deployment
To deploy a version to production:
1. Go to Actions → Deploy to Production workflow
2. Click "Run workflow"
3. Enter the version to deploy (e.g., `1.9.1` or `latest`)
4. Click "Run workflow" to start deployment

### Manual Deployment via SSH

If you need to manually deploy a specific version:

```bash
# SSH into the production server
ssh user@your-server

# Navigate to the project directory (using your DEPLOY_PATH)
cd /path/to/deployment

# Pull and start a specific version
VERSION=1.9.1 docker compose -f docker-compose.yml -f docker-compose.prod.yml pull
VERSION=1.9.1 docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## Backup Recommendation

Before your first deployment with ghcr.io images, it's recommended to backup your MongoDB data:

```bash
# Create a backup of the MongoDB volume
docker run --rm -v mongodb_data_container:/data -v /backup:/backup alpine tar czf /backup/mongodb-backup-$(date +%Y%m%d).tar.gz -C /data .

# Or use mongodump for a database-level backup
docker exec mongo mongodump --out /data/db/backup-$(date +%Y%m%d)
```

## Initial Production Setup

For a new production server:

1. Create the deployment directory:
   ```bash
   mkdir -p /path/to/deployment
   cd /path/to/deployment
   ```

2. Copy the required files from the repository (or let the deployment do it)

3. Create the `.env` file with all required runtime variables:
   ```bash
   cp .env.sample .env
   # Edit .env with your production values
   ```

4. Start the services:
   ```bash
   VERSION=latest docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
   ```

5. Set up cron jobs for maintenance (if not already configured):
   ```bash
   # Add to crontab (crontab -e)
   # MongoDB backup - daily at 2 AM
   0 2 * * * cd /path/to/deployment && ./mongo-backup
   
   # SSL certificate renewal - weekly on Sunday at 3 AM
   0 3 * * 0 cd /path/to/deployment && ./renew-certs
   ```

## Troubleshooting

### Images not pulling?
- Make sure the repository is public (private repos need authentication)
- Check that the version tag exists in the registry

### Build failing in GitHub Actions?
- Check the Actions tab for detailed logs
- Ensure all required secrets are set
- Verify Dockerfiles have proper multi-stage build targets

### Need to rollback?
```bash
# On production server
VERSION=<previous-version> docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```