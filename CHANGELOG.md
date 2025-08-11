# Changelog

## 1.12.0

_2025-08-11_

### What's Changed

#### Features

- feat: Enhanced monitoring configuration and management by @greenham in https://github.com/greenham/helpasaur-king/pull/94
  - Created configuration generator script to maintain dev/prod configs from single template
  - Implemented API-based monitor import using Socket.io to bypass deprecated backup/restore
  - Added dedicated health check ports for all services (3010-3013)
  - Standardized port assignments: services (3000-3003), health checks (3010-3013), Uptime Kuma (3333)
  - WebSocket Relay now runs dual-port operation (main service + health check)

#### Infrastructure

- refactor: Move monitoring to local-only deployment by @greenham
  - Removed monitoring stack from production server deployment
  - Simplified package.json scripts for local monitoring management
  - Monitoring now runs independently on developer machines only
  - Removed production monitoring shell script (no longer needed)

#### Improvements

- fix: Add JSON path monitoring for health endpoints in both dev and prod by @greenham
- refactor: Consolidate and improve monitoring configurations by @greenham
  - Unified service descriptions and icons across environments
  - Removed redundant tags and simplified monitor names
  - Generated configs now use environment variables for port configuration

#### Bug Fixes

- fix: Resolved Uptime Kuma import issues with json-query monitors by @greenham
  - Discovered backup/restore doesn't properly handle jsonPath/expectedValue fields
  - Created API-based solution to programmatically create monitors with all fields

**Full Changelog**: https://github.com/greenham/helpasaur-king/compare/1.11.0...1.12.0

## 1.11.0

_2025-08-10_

### What's Changed

#### Infrastructure

- feat: Separate monitoring stack for improved reliability by @greenham in https://github.com/greenham/helpasaur-king/pull/93
  - Moved Uptime Kuma to independent `docker-compose.monitoring.yml` file
  - Removed all dependencies between monitoring and application stacks
  - Monitoring continues running during application deployments
  - Each stack now has its own network with no cross-dependencies

#### Features

- feat: Add comprehensive monitoring management commands by @greenham
  - New `pnpm monitor:*` commands for stack management
  - Backup and restore functionality for monitoring data
  - Shell script for monitoring operations (start, stop, restart, status, logs)
  - Separate configuration files for internal and external monitoring

#### Refactor

- refactor: Improve monitoring configuration structure by @greenham
  - Split monitoring configs into `docker-services-internal.json` and `docker-services-external.json`
  - Added emoji icons to service names for better visual distinction
  - Removed MongoDB from monitoring for security (not exposed to host)
  - Updated documentation with complete setup and migration instructions

#### Bug Fixes

- fix: Deploy web app after backend to prevent version mismatches by @greenham
  - Ensures backend is ready before frontend deployment

**Full Changelog**: https://github.com/greenham/helpasaur-king/compare/1.10.0...1.11.0

## 1.10.0

_2025-08-10_

### What's Changed

#### Features

- feat: Add comprehensive Twitch bot configuration UI by @greenham in https://github.com/greenham/helpasaur-king/pull/92
  - Web interface for managing bot settings with real-time updates
  - Toggle switches for enabling/disabling commands and practice lists
  - Dynamic command prefix selector with visual feedback
  - Moderator access controls for practice list management
  - Configuration changes propagate via WebSocket to bot

- feat: Add `!pracmods` command for toggling moderator access to practice lists by @greenham in https://github.com/greenham/helpasaur-king/pull/91
  - Broadcasters can now control mod access via `!pracmods on/off`
  - DRY refactoring of toggle commands using shared handler

- feat: Create public API endpoint for configuration constants by @greenham
  - Centralized source of truth for allowed command prefixes
  - Future-proof structure for additional public configurations

#### Bug Fixes

- fix: Twitch bot now respects `commandsEnabled` setting when processing commands by @greenham
- fix: Reduce Sass deprecation warnings by downgrading to version 1.79.6 by @greenham
- fix: Update Uptime Kuma healthcheck to use Node.js instead of wget by @greenham

#### Refactor

- refactor: Add memoization and null checks for improved robustness by @greenham
  - Optimized React component performance with useMemo
  - Added comprehensive null safety checks

**Full Changelog**: https://github.com/greenham/helpasaur-king/compare/1.9.3...1.10.0

## 1.9.3

_2025-08-10_

### What's Changed

#### Monitoring & Observability

- feat: Implement comprehensive monitoring with Uptime Kuma by @greenham in https://github.com/greenham/helpasaur-king/pull/90
  - Added Uptime Kuma service for monitoring all Helpasaur services
  - Created modular monitoring configurations for different environments
  - Implemented SSL certificate expiry monitoring for production domains
  - Configured nginx reverse proxy for status.helpasaur.com subdomain
  - Added comprehensive tag system for service organization (Critical, Important, Standard)
  - Monitors 9 services via health endpoints with appropriate check intervals

#### Infrastructure Improvements

- feat: Add log rotation to all Docker services for better disk management by @greenham
- fix: Force container recreation during production deployment for reliability by @greenham
- fix: Update nginx healthcheck after web service migration by @greenham
- chore: Consolidate Uptime Kuma into main docker-compose.yml for simpler deployment by @greenham
- chore: Remove redundant nginx configuration files by @greenham

#### Web Application

- fix: Pass custom_domain to GitHub Pages deployment workflow by @greenham
- fix: Remove web service from docker-compose.ghcr.yml after migration by @greenham

**Full Changelog**: https://github.com/greenham/helpasaur-king/compare/1.9.2...1.9.3

## 1.9.2

_2025-08-09_

### What's Changed

- feat: Migrate web app to GitHub Pages static hosting by @greenham in https://github.com/greenham/helpasaur-king/pull/89

**Full Changelog**: https://github.com/greenham/helpasaur-king/compare/1.9.1...1.9.2

## 1.9.1

_2025-08-09_

### What's Changed

#### Major Infrastructure Updates

- feat: Migrate from Yarn to pnpm for package management by @greenham in https://github.com/greenham/helpasaur-king/pull/87
- feat: Implement GitHub Container Registry (ghcr.io) for Docker image distribution by @greenham
- refactor: Optimize Docker base image and improve build efficiency by @greenham in https://github.com/greenham/helpasaur-king/pull/88

#### Build & Deployment Improvements

- feat: Separate build and deploy workflows for better control by @greenham
- feat: Add manual deployment trigger with configurable version input by @greenham
- feat: Implement proper multi-stage Docker builds for all services by @greenham
- fix: Update deployment to use configurable DEPLOY_PATH secret by @greenham
- fix: Include maintenance scripts (mongo-backup, renew-certs) in deployment by @greenham

#### Docker Optimizations

- feat: Pre-install pnpm@8 and nodemon in base image for faster builds by @greenham
- feat: Implement single pnpm-lock.yaml at workspace root by @greenham
- fix: Add missing source files to development Docker stages by @greenham
- fix: Proper ARG/ENV handling for build-time variables in web service by @greenham
- perf: Reduce production image sizes by separating build and runtime dependencies by @greenham

#### Developer Experience

- feat: Add pnpm workspace configuration for monorepo management by @greenham
- fix: Add build:base script for helpa-base image builds by @greenham
- docs: Add comprehensive GitHub Container Registry setup documentation by @greenham

**Full Changelog**: https://github.com/greenham/helpasaur-king/compare/1.9.0...1.9.1

## 1.9.0

_2025-08-09_

### What's Changed

- Fix: Improve yarn install reliability in Docker builds by @greenham in https://github.com/greenham/helpasaur-king/pull/83
- feat: Add comprehensive health checks for all services by @greenham in https://github.com/greenham/helpasaur-king/pull/84
- Upgrade axios in helpa-api-client to ^1.8.2 per #145 and #161 by @greenham in https://github.com/greenham/helpasaur-king/pull/85
- Security/upgrade axios retry by @greenham in https://github.com/greenham/helpasaur-king/pull/86

**Full Changelog**: https://github.com/greenham/helpasaur-king/compare/1.8.3...1.9.0

## 1.8.3

_2025-08-09_

### What's Changed

- Bump @babel/runtime from 7.23.8 to 7.28.2 in /twitch by @dependabot[bot] in https://github.com/greenham/helpasaur-king/pull/76
- Bump @babel/runtime from 7.23.9 to 7.28.2 by @dependabot[bot] in https://github.com/greenham/helpasaur-king/pull/77
- Bump axios from 1.7.4 to 1.8.2 in /api by @dependabot[bot] in https://github.com/greenham/helpasaur-king/pull/78
- Bump @babel/runtime from 7.23.8 to 7.28.2 in /discord by @dependabot[bot] in https://github.com/greenham/helpasaur-king/pull/80
- Bump form-data from 4.0.0 to 4.0.4 in /discord by @dependabot[bot] in https://github.com/greenham/helpasaur-king/pull/79
- feat: tag Docker images with release version for automatic container updates by @greenham in https://github.com/greenham/helpasaur-king/pull/81
- Bump form-data from 4.0.0 to 4.0.4 in /racebot by @dependabot[bot] in https://github.com/greenham/helpasaur-king/pull/82

**Full Changelog**: https://github.com/greenham/helpasaur-king/compare/1.8.2...1.8.3

## 1.8.2

_2025-08-08_

### What's Changed

- feat: Enable users to toggle practice lists via Twitch chat by @greenham in https://github.com/greenham/helpasaur-king/pull/73
- Bump mongoose from 7.6.8 to 8.9.5 in /api by @dependabot[bot] in https://github.com/greenham/helpasaur-king/pull/72

**Full Changelog**: https://github.com/greenham/helpasaur-king/compare/1.8.1...1.8.2

## 1.8.1

- Pinned mongo version to 7-jammy to resolve issue with upgrading to 8
- Resolved dependabot alerts for various packages

## 1.8.0

### Twitch Bot

- Support for per-channel configurations! 🥳
  - Instead of just joining a static list of channels, the Twitch Bot will now join _users_ who have the bot active. 😲
  - This opens up the ability for users to configure the bot specifically for their channel instead of being tied to the global defaults
  - The ability to change these values is not exposed _yet_, but will eventually be through chat commands as well as the web UI.
  - Users will **eventually** be able to control things like:
    - **Command prefix** _(free yourself from the shackles of `!`)_
    - **Enable/disable commands** _(if you just want the bot to shut up for a bit, but don't want to kick it out)_
    - **Enable/disable practice lists** _(still in BETA from 1.7.2, but will soon be opt-in for all!)_
    - **Enable/disable weekly race alerts** _(will post the race room link in your chat ~30 minutes before the weekly starts)_
  - This also resolves the issue of the bot being orphaned after username changes!
- `!pracrand` will no longer return the same room twice in a row as long as there are more than 2 items in the list

## 1.7.3

- Support search links with hash locations e.g. [https://helpasaur.com/commands#tutorial](https://helpasaur.com/commands#tutorial)

## 1.7.2

- [BETA] Support per-channel practice lists via Twitch chat commands
  - Can be used by the broadcaster and mods
  - Currently only enabled for a few select channels during beta
  - Commands:
    - `!pracadd <entry>` -- adds a new entry to the list
    - `!pracrand` -- supplies a random entry from the list
    - `!praclist` -- returns the entire list
    - `!pracdel <#>` -- deletes a specific entry in the list
    - `!pracclear` -- clears the entire list

## 1.7.1

- Support activating / de-activating discord bot (soft delete on guildDelete)

## 1.7.0

- Added support for users to self-manage the discord bot
  - Added page at https://helpasaur.com/discord with instructions and command list
  - Support configuration through slash commands (server owners only to start)

## 1.6.4

- Fix extraneous guard on twitch endpoint
- Better validation for command and alias uniqueness
- Better error handling for twitch bot actions

## 1.6.3

- Granularly guard endpoints via express-jwt-permissions

## 1.6.2

- Admins can now remove users from stream alerts via the web app

## 1.6.1

- Secure stream alerts endpoints
- Admins can now add users to stream alerts via the web app

## 1.6.0

- All services now use JWTs for the API just like users
- All endpoints are now secured with JWTs
- Users and services now use the same endpoint for Twitch actions
- Extracted Helpa API client into its own package
- Adjusted docker builds to make this package available
- Standardizing Twitch and Discord bot code
- Make toast alert text more readable

## 1.5.1

- Enforce command name uniqueness when creating
- Visual touches here and there, better error handling

## 1.5.0

- Users can now log in via Twitch OAuth flow
- Authenticated users can now manage the Twitch Bot
  - Request bot to join/leave
- Admin tools
  - Create/update/delete commands

## Lots of untracked changes before this
