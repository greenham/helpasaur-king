# GitHub Container Registry Setup

This project now uses GitHub Container Registry (ghcr.io) to store and distribute Docker images.

## How it Works

1. **Build Phase**: When a release is published, GitHub Actions builds all Docker images and pushes them to ghcr.io
2. **Deploy Phase**: The production server pulls the pre-built images from ghcr.io (no building on production)
3. **Cleanup**: Old image versions are automatically cleaned up, keeping only the last 3 versions

## Required GitHub Secrets

Make sure these secrets are set in your repository settings (Settings → Secrets and variables → Actions):

### Existing Secrets (should already be set):
- `DROPLET_IP` - Your DigitalOcean droplet IP address
- `DROPLET_USER` - SSH user for deployment (usually `root` or a sudo user)
- `DROPLET_SSH_KEY` - Private SSH key for accessing the droplet
- `PERSONAL_ACCESS_TOKEN` - GitHub PAT for pushing changelog updates

### New Secrets Required:
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

The production server at `/srv/helpa` only needs:
- `docker-compose.yml` - Base Docker configuration
- `docker-compose.prod.yml` - Production overrides with ghcr.io image references
- `.env` - Runtime environment variables (NOT in git, managed separately)
- `nginx/` - Nginx configuration files
- `docker-entrypoint-initdb.d/` - MongoDB initialization scripts

**No source code or build files are needed on production!**

## Manual Deployment

If you need to manually deploy a specific version:

```bash
# SSH into the production server
ssh user@your-server

# Navigate to the project directory
cd /srv/helpa

# Pull and start a specific version
VERSION=1.9.1 docker compose -f docker-compose.yml -f docker-compose.prod.yml pull
VERSION=1.9.1 docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## Initial Production Setup

For a new production server:

1. Create the directory:
   ```bash
   mkdir -p /srv/helpa
   cd /srv/helpa
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