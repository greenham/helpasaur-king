# Development Workflow

After migrating the web app to GitHub Pages, the local development workflow has changed slightly.

## Starting Development Environment

### Option 1: All-in-One (Recommended)
```bash
pnpm start  # Starts both backend services and web dev server
pnpm logs   # In another terminal to watch Docker logs
```

### Option 2: Separate Control

**Terminal 1 - Backend Services:**
```bash
pnpm start:backend  # Starts all Docker services (API, bots, MongoDB, nginx, etc.)
pnpm logs          # Watch logs in real-time
```

**Terminal 2 - Web Application:**
```bash
pnpm start:web  # Starts the web dev server on port 3000
```

## How It Works

1. **Backend services** run in Docker containers as before
2. **Web application** runs locally on your host machine at `http://localhost:3000`
3. **Nginx** (running in Docker) proxies requests:
   - `http://localhost:8888` → `http://localhost:3000` (web app on host)
   - This uses `host.docker.internal` to reach the host machine from within Docker

## Environment Variables

The web app requires these environment variables during development:
- `API_HOST`: Points to the local API (default in .env should be `http://localhost:8888`)
- `TWITCH_APP_CLIENT_ID`: Your Twitch application client ID

These should be configured in `web/.env` for local development.

## Common Tasks

### View all services
```bash
docker compose ps
```

### Stop everything
```bash
pnpm stop
```

### Rebuild and restart everything
```bash
pnpm boom  # Rebuilds Docker images and restarts everything
```

### View logs for specific service
```bash
docker compose logs -f api-server
docker compose logs -f discord-bot
```

## Troubleshooting

### Web app not accessible through nginx
- Make sure the web dev server is running (`pnpm start:web` or `pnpm start`)
- Check that port 3000 is not blocked
- On Linux, ensure Docker can reach the host (the `extra_hosts` configuration should handle this)

### "API_HOST environment variable is not defined" error
- Create `web/.env` file with:
  ```
  API_HOST=http://localhost:8888
  TWITCH_APP_CLIENT_ID=your_client_id_here
  ```

### Changes to web app not reflecting
- The web dev server has hot reload enabled
- If changes don't appear, restart the web dev server
- Clear browser cache if needed

## Production Deployment

The web app is automatically deployed to GitHub Pages when:
1. You run the production deployment workflow
2. The workflow triggers the GitHub Pages deployment

No manual web deployment is needed anymore!