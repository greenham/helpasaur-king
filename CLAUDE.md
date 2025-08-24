# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Helpasaur King is a microservices-based application for the A Link to the Past (ALttP) speedrunning community, providing Discord/Twitch bot functionality, stream management, and race coordination.

## Core Services Architecture

- **API** (`/api/`): Express.js REST API with MongoDB, JWT auth, Socket.io, Twitch EventSub webhooks
- **Discord Bot** (`/discord/`): Discord.js v14 bot for commands, go-live notifications, race announcements
- **Twitch Bot** (`/twitch/`): tmi.js bot for Twitch chat commands
- **Web App** (`/web/`): React 18 + TypeScript frontend with Parcel, Bootstrap 5, TanStack Query, Chart.js for data visualization (hosted on GitHub Pages)
- **Race Bot** (`/racebot/`): TypeScript service for weekly racetime.gg race creation (Sundays 11:30 AM PT)
- **Runner Watcher** (`/runnerwatcher/`): Stream monitoring via Twitch EventSub
- **WebSocket Relay** (`/ws-relay/`): Socket.io hub for inter-service communication
- **Shared Libraries** (`/libs/`):
  - `@helpasaur/api-client`: Common Axios-based API client for all services
  - `@helpasaur/types`: Shared TypeScript types and interfaces
  - `@helpasaur/bot-common`: Common bot functionality and utilities
  - `twitch-api-client`: Twitch API client wrapper
- **Monitoring** (`/monitoring/`): Uptime Kuma monitoring stack (separate from main application)

## Essential Development Commands

**IMPORTANT: Always use these pnpm commands instead of direct docker/docker-compose commands**

```bash
# Development (from root)
pnpm start              # Start all services (uses docker-compose.yml + override.yml automatically)
pnpm start:web          # Start web dev server (run in separate terminal)
pnpm start:libs         # Start all shared library watch builds for hot reloading
pnpm dev                # Start everything: libraries + services (full dev environment)
pnpm stop               # Stop all Docker services
pnpm build              # Build all Docker images locally (docker-compose.build.yml)
pnpm build:prod         # Build production images with registry tags (docker-compose.build.prod.yml)
pnpm build:push         # Build and push production images to registry
pnpm logs               # View app service logs (api, discord, twitch, runnerwatcher, racebot, ws-relay)
pnpm logs:all           # View all Docker service logs (including mongo/mongo-express)
pnpm boom               # Full rebuild and restart (stop, build, start, logs)
pnpm version:bump       # Bump version in all package.json files

# Code Quality & Formatting
pnpm format             # Format all code with Prettier
pnpm format:check       # Check code formatting without making changes
pnpm lint               # Check code for ESLint issues
pnpm lint:fix           # Auto-fix ESLint issues where possible
pnpm lint:check         # Check ESLint with zero tolerance for warnings
pnpm typecheck          # Type check all services and libraries
pnpm typecheck:libs     # Type check only shared libraries

# Monitoring Stack Commands (local development only)
pnpm monitor:start      # Start Uptime Kuma monitoring locally
pnpm monitor:stop       # Stop monitoring
pnpm monitor:restart    # Restart monitoring
pnpm monitor:logs       # View monitoring logs
pnpm monitor:generate   # Generate monitoring configs from template
pnpm monitor:import     # Import configs to Uptime Kuma via API
```

**Note**: Web app runs locally on your host machine (not in Docker). For full development:
1. `pnpm dev` - Starts libraries + Docker services (recommended for active development)
2. OR manually: `pnpm start:libs` + `pnpm start` + `pnpm start:web` in separate terminals

## Production Scripts

Located in `/scripts/` directory (deployed to production server):

```bash
# Deployment and maintenance (run on production server only)
bash ./scripts/deploy.sh [VERSION]       # Deploy specific version (default: latest)
bash ./scripts/cleanup.sh [KEEP_COUNT]   # Clean old Docker images (default: keep 3)
bash ./scripts/mongo-backup.sh           # Create MongoDB backup
bash ./scripts/renew-certs.sh            # Renew SSL certificates
```

## Service Dependency Graph

```mermaid
graph TD
    %% Core Infrastructure
    mongo[MongoDB]
    mongo-express[Mongo Express]
    ws-relay[WebSocket Relay]
    helpa-base[Helpa Base Library]

    %% Services
    api[API Server]
    discord[Discord Bot]
    twitch[Twitch Bot]
    web[Web App]
    nginx[Nginx]
    runnerwatcher[Runner Watcher]
    racebot[Race Bot]

    %% Dependencies
    mongo-express -->|service_healthy| mongo

    api -->|service_healthy| mongo
    api -->|service_healthy| ws-relay

    discord -->|service_healthy| api
    discord -->|service_completed| helpa-base

    twitch -->|service_healthy| api
    twitch -->|service_completed| helpa-base

    runnerwatcher -->|service_healthy| api
    runnerwatcher -->|service_healthy| ws-relay
    runnerwatcher -->|service_completed| helpa-base

    racebot -->|service_healthy| ws-relay

    web -->|runs locally| host[Host Machine]

    nginx -->|proxy to host:3000| web

    %% Styling
    classDef infrastructure fill:#d4a,stroke:#333,stroke-width:2px
    classDef service fill:#89c,stroke:#333,stroke-width:2px
    classDef frontend fill:#8b8,stroke:#333,stroke-width:2px

    class mongo,mongo-express,ws-relay,helpa-base infrastructure
    class api,discord,twitch,runnerwatcher,racebot service
    class web,nginx frontend
```

## Code Quality & Linting

- **ESLint**: Comprehensive linting with TypeScript support (`eslint.config.js`)
  - Service-specific rules for Node.js backend services vs React web app
  - TypeScript rules: prevents `any` types, enforces proper variable usage
  - Code quality rules: prefer-const, strict equality, template literals
  - Browser globals support for web components
  - Prettier integration for consistent formatting
- **Prettier**: Code formatting with project-wide configuration
- **TypeScript**: Strict type checking across all services and libraries

## Database & Infrastructure

- **MongoDB 7**: Main database, accessed via Mongoose ODM
- **Docker Compose**: Orchestrates all services with separated concerns
  - `docker-compose.yml`: Runtime configuration (services, networks, volumes, health checks)
  - `docker-compose.build.yml`: Local development build configuration (simple tags like helpa-api:dev)
  - `docker-compose.build.prod.yml`: CI/production build configuration (registry tags like ghcr.io/...)
  - `docker-compose.override.yml`: Development overrides (auto-loaded, contains volume mounts)
  - `docker-compose.monitoring.yml`: Uptime Kuma monitoring stack (local development only)
- **Nginx**: Reverse proxy for API/services (production), proxies to local web dev server (development)
- **Uptime Kuma**: Service monitoring dashboard (local only, port 3333) - monitors production services externally
- **Environment**: Services use `.env` files (not committed), see `.env.sample` files

## Key Development Patterns

### API Communication

- Services communicate via the shared `@helpasaur/api-client` library
- Common types are shared via `@helpasaur/types` across all services
- Bot services use `@helpasaur/bot-common` for shared functionality
- WebSocket relay broadcasts real-time events between services
- API uses JWT tokens for authentication (Twitch OAuth integration)

### MongoDB Models (in `/api/models/`)

- `Command`: Bot commands for Discord/Twitch
- `Stream`: Twitch stream tracking
- `Configuration`: Service configuration storage
- `Race`: Weekly race information
- `User`: User authentication and preferences

### Frontend Routing (in `/web/src/`)

- `/commands`: Command directory
- `/streams`: ALttP stream directory
- `/twitch`: Twitch bot management
- `/admin`: Admin panel with tabbed interface (requires auth)
  - Command statistics and analytics dashboards
  - Stream alert management
  - Twitch bot configuration
  - Test event functionality

### Real-time Features

- Socket.io connections in API, web app, and ws-relay
- Twitch EventSub webhooks for stream events
- racetime.gg WebSocket for race room interaction

## Testing & Deployment

- No formal test suite - manual testing in dev environment
- GitHub Actions CI/CD pipeline:
  - Builds and pushes images to ghcr.io on release
  - Manual deployment trigger via workflow_dispatch
- Production URLs: helpasaur.com (GitHub Pages), api.helpasaur.com, rw.helpasaur.com

## Development Workflow

### Code Quality Process

1. **Before committing**: Run `pnpm lint:fix` to auto-fix common issues
2. **Code review**: Use `pnpm lint:check` to ensure zero warnings/errors
3. **Formatting**: Run `pnpm format` to ensure consistent code style
4. **Type checking**: ESLint enforces TypeScript best practices across all services

### Recommended Development Flow

**For active shared library development:**
1. Run `pnpm dev` - starts all library watchers + Docker services
2. Run `pnpm start:web` in separate terminal for web app
3. Make changes to shared libraries - they auto-rebuild and containers restart
4. Test changes across all services with hot reloading

**For regular development:**
1. Run `pnpm start` for Docker services
2. Run `pnpm start:web` for web app  
3. Make code changes and test

**Before committing:**
1. Run `pnpm lint:fix` to auto-fix issues
2. Run `pnpm format` to ensure consistent formatting
3. Commit and push changes

## Common Tasks

### Adding a new bot command

1. Create command in MongoDB via API or admin panel
2. Commands are fetched dynamically by Discord/Twitch bots
3. Use `type: 'basic'` for simple text responses

### Modifying stream detection

1. Runner watcher service handles Twitch EventSub webhooks
2. Stream alerts are managed in `/runnerwatcher/src/`
3. ALttP game detection uses Twitch game ID filtering

### Working with weekly races

1. Race bot creates races Sunday 11:30 AM PT
2. Configuration in `/racebot/src/config.ts`
3. Race announcements go through Discord bot

### Frontend development

1. React components in `/web/src/components/`
2. API calls use TanStack Query hooks
3. Bootstrap theme customization in `/web/src/scss/`
4. Data visualization with Chart.js and react-chartjs-2
5. Admin panel includes command statistics and analytics dashboards
6. Run locally with `pnpm start:web` (not in Docker)
7. Deployed to GitHub Pages on production

### Setting up monitoring (local only)

1. Start monitoring stack locally: `pnpm monitor:start`
2. Access Uptime Kuma at http://localhost:3333
3. Generate configs: `pnpm monitor:generate`
4. Import configs via API: `pnpm monitor:import app-services.dev.json` or `app-services.prod.json`
5. Monitoring runs locally, separate from production deployment
6. Production monitoring uses external URLs to monitor services remotely

## Environment Variables

Each service has a `.env.sample` file showing required variables. Key ones:

- `TWITCH_CLIENT_ID/SECRET`: Twitch app credentials
- `DISCORD_TOKEN`: Discord bot token
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: API authentication secret
- `RACETIME_TOKEN`: racetime.gg API token
- `API_HOST`: API URL for web app (required at build time)
- `TWITCH_APP_CLIENT_ID`: Twitch client ID for web app (required at build time)

**Important**: Use pnpm for all package operations and update CLAUDE.md when package.json scripts are modified.
- Before running a package.json script, ensure you are in the root directory of the project.