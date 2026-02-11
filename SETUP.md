# Server Setup Guide

## Prerequisites

- [ ] New DigitalOcean droplet provisioned (Ubuntu 24.04 LTS)
- [ ] Root SSH access to the new server
- [ ] MongoDB backup file (`mongo-backup-*.tar.gz`)
- [ ] Copy of the production `.env` file
- [ ] Access to GitHub repo settings for updating Actions secrets

---

## Phase 1: New Server Setup

### 1.1 Install Docker

```bash
# As root on the new server
curl -fsSL https://get.docker.com | sh
```

### 1.2 Create the service user

```bash
# Create user
useradd -m -s /bin/bash helpa

# Add to docker group
usermod -aG docker helpa

# Create project directory
mkdir -p /srv/helpa
chown helpa:helpa /srv/helpa
```

### 1.3 Set up SSH keys

```bash
# Create .ssh directory for helpa user
mkdir -p /home/helpa/.ssh
chmod 700 /home/helpa/.ssh
```

Add two public keys to `/home/helpa/.ssh/authorized_keys`:

1. Your personal SSH public key (for manual access)
2. A deploy key for GitHub Actions

To generate a new deploy key:

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f helpa-deploy-key
```

Set permissions:

```bash
chown -R helpa:helpa /home/helpa/.ssh
chmod 600 /home/helpa/.ssh/authorized_keys
```

### 1.4 Set up UFW firewall

```bash
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

---

## Phase 2: DNS and SSL

### 2.1 Update DNS records

Point these A records to the new server's IP:

- `api.helpasaur.com`
- `rw.helpasaur.com`
- `static.helpasaur.com`

(`helpasaur.com` itself points to GitHub Pages — no change needed.)

### 2.2 Install and run Certbot

Wait for DNS propagation before running this.

```bash
# As root
apt install certbot -y

# Generate certs (no web server can be running on port 80)
certbot certonly --standalone -d api.helpasaur.com
certbot certonly --standalone -d rw.helpasaur.com
certbot certonly --standalone -d static.helpasaur.com
```

---

## Phase 3: Rotate All Secrets

Generate new values for **every secret** in the `.env` file.

| Secret | How to generate |
|--------|----------------|
| `MONGO_ROOT_PASSWORD` | `openssl rand -hex 24` |
| `MONGO_EXPRESS_PASSWORD` | `openssl rand -hex 24` |
| `API_SECRET_KEY` | `openssl rand -hex 24` |
| `JWT_SECRET_KEY` | `openssl rand -hex 24` |
| `TWITCH_EVENTSUB_SECRET_KEY` | `openssl rand -hex 32` |
| Twitch app credentials | Regenerate at https://dev.twitch.tv/console |
| racetime.gg bot credentials | Regenerate at racetime.gg |
| Discord bot token | Regenerate at https://discord.com/developers/applications |

Place the updated `.env` file at `/srv/helpa/.env` on the new server.

---

## Phase 4: Update GitHub Actions Secrets

In the GitHub repo, go to **Settings > Secrets and variables > Actions** and update:

| Secret | New value |
|--------|-----------|
| `DROPLET_IP` | New server's IP address |
| `DROPLET_USER` | `helpa` |
| `DROPLET_SSH_KEY` | Private key from the deploy keypair generated in step 1.3 |
| `DEPLOY_PATH` | `/srv/helpa` |

---

## Phase 5: Deploy

### 5.1 Run the deployment

Trigger the **deploy-to-prod** workflow from GitHub Actions with the desired version.

This will SCP the compose files, nginx config, and scripts to the new server, then pull images from ghcr.io and start the services.

### 5.2 Verify services are running

```bash
# As helpa on the new server
cd /srv/helpa
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
```

All services should show as `healthy` after the start period.

---

## Phase 6: Restore Database

### 6.1 Copy backup to the new server

```bash
scp mongo-backup-2026-02-02_010001.tar.gz helpa@NEW_SERVER_IP:/srv/helpa/
```

### 6.2 Restore the backup

```bash
# On the new server as helpa
cd /srv/helpa
source .env

# Get the mongo container ID
CONTAINER=$(docker ps --filter "name=mongo" --format "{{.ID}}" | head -1)

# Copy backup into the container
docker cp mongo-backup-2026-02-02_010001.tar.gz $CONTAINER:/backup.tar.gz

# Extract inside the container
docker exec $CONTAINER tar -xzf /backup.tar.gz -C /

# Restore, dropping the empty database
docker exec $CONTAINER mongorestore \
  --authenticationDatabase admin \
  --username $MONGO_ROOT_USERNAME \
  --password $MONGO_ROOT_PASSWORD \
  --db $MONGO_DATABASE_NAME \
  --drop \
  /dump/$MONGO_DATABASE_NAME

# Clean up
docker exec $CONTAINER rm -rf /dump /backup.tar.gz
```

### 6.3 Update credentials in the database

The `configs` collection contains service credentials (Discord token, Twitch OAuth, etc.) that need to match your rotated secrets. Update these via Mongo Express in development, or directly via `mongosh`:

```bash
docker exec -it $CONTAINER mongosh \
  --username $MONGO_ROOT_USERNAME \
  --password $MONGO_ROOT_PASSWORD \
  --authenticationDatabase admin \
  $MONGO_DATABASE_NAME
```

---

## Phase 7: Set Up Cron Jobs

```bash
# As root, create the log directory
mkdir -p /var/log/cron
chown helpa:helpa /var/log/cron

# As helpa, edit crontab
su - helpa
crontab -e
```

Add the following:

```cron
# Renew certs for helpasaur.com and subdomains
# Runs once a week on Sundays @ 3am
0 3 * * SUN cd /srv/helpa && /bin/bash ./scripts/renew-certs.sh >> /var/log/cron/letsencrypt-renew.log 2>&1

# Create a backup of helpa database
# Runs every morning at 1AM
0 1 * * * cd /srv/helpa && /bin/bash ./scripts/mongo-backup.sh >> /var/log/cron/helpa-mongo-backup.log 2>&1
```
