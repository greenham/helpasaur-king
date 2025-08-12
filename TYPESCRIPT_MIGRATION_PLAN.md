# TypeScript Migration Plan for Helpasaur King

## Overview
This document outlines the plan for migrating all JavaScript code in the Helpasaur King repository to TypeScript while maintaining 1:1 functional parity.

## Original Prompt

Your task is to help me migrate all of the JavaScript code in this repository to TypeScript. When planning this task, identify any potential challenges or issues we may have with the migration so we can do a risk analysis.

These rules must be followed:
- You must maintain 1:1 functional parity -- do not change any business logic or code architecture.
- Any JavaScript file that you convert to TypeScript must be done with a `git mv` operation so we can more easily compare the contents in the pull request. In other words: do not delete the old JavaScript file and create a new TypeScript file, rename it instead.
- Create shared types for events/messages/objects that are used in services communicating with each (via the API, websocket server, etc.) -- do not duplicate types! Any code intended to be shared across services should go in the `/lib` directory.
- Create new interfaces and types as appropriate for the important object schemas in our codebase.
Guidelines:
- Use the most modern and reliable configuration for TypeScript that will give us the best of balance of security and safety along with a pleasant developer experience.
- If an existing library that we're using has good TypeScript support, be sure to import its types and use them appropriately throughout the codebase.
- If an existing library that we're using does NOT have good TypeScript support, see if there is an easy upgrade path to a newer version that does have good TypeScript support.

## Migration Status (As of 2025-08-12)

### ✅ Completed Services

#### Shared Library & Types
- **Created `/lib/types/`** - Comprehensive shared type definitions ✅
  - WebSocket relay events and data types
  - MongoDB model interfaces (Command, Stream, User, Configuration, Race)
  - API request/response types
  - Service configuration types
  - Common enums and utilities
  - Note: Using `/lib/types/` instead of `/lib/helpa-types/` for simplicity

#### Fully Migrated Services
- **helpa-api-client** ✅
  - Complete TypeScript conversion
  - Proper type exports for API client usage
  - Integration with shared types library
  
- **ws-relay** ✅
  - Full TypeScript conversion
  - Socket.io typing with custom socket interface
  - Health check endpoint typed
  
- **twitch bot** ✅
  - Both bot.ts and index.ts converted
  - tmi.js client properly typed
  - Health endpoint with status monitoring
  
- **runnerwatcher** ✅
  - All 4 files migrated to TypeScript
  - Custom type declarations created for node-twitch library
  - EventEmitter patterns properly typed
  - Constants exported with const assertion

- **racebot** ✅
  - Already was TypeScript (no migration needed)

#### Partially Migrated Services
- **discord bot** ⚠️
  - Core files migrated: bot.ts, index.ts, constants.ts, deploy-commands.ts
  - Event handlers remain JavaScript (9 files in `/events/`)
  - Command handlers remain JavaScript (files in `/commands/`)
  - Dockerfile updated for TypeScript compilation
  
- **api service** ⚠️
  - Main index.ts converted
  - 22 other JavaScript files remain for gradual migration
  - Dockerfile updated with TypeScript build support

### 📋 Remaining Tasks

#### Discord Bot Completion
**Files to migrate:**
- `/discord/src/events/` (all .js files):
  - guildCreate.js
  - guildDelete.js
  - messageCreate.js
  - ready.js
  - (and any others)
- `/discord/src/commands/` (all .js files):
  - config.js
  - (and any others)

**Approach:**
1. Use `git mv` to rename each .js to .ts
2. Add proper Discord.js v14 TypeScript typing
3. Import shared types from `@helpasaur/types`
4. Ensure event and command exports match expected interfaces

#### API Service Completion
**Files to migrate (22 remaining):**
- All files in `/api/src/` except index.ts
- Key directories likely include:
  - `/api/src/routes/`
  - `/api/src/models/`
  - `/api/src/middleware/`
  - `/api/src/controllers/`
  - `/api/src/utils/`

**Approach:**
1. Start with models - add Mongoose TypeScript definitions
2. Migrate middleware with proper Express typing
3. Convert routes with request/response typing
4. Update controllers with proper async/await typing
5. Convert utility functions last

#### Build System Updates
- ✅ All Dockerfiles updated with TypeScript compilation
- ✅ Multi-stage builds configured for production optimization
- ✅ Package.json files updated with TypeScript scripts

### 🔧 Testing & Deployment

#### Local Testing Steps
1. Run `pnpm install` in root to update all dependencies
2. Test individual services:
   ```bash
   pnpm build  # Build all TypeScript services
   pnpm start  # Start all services in Docker
   pnpm logs   # Check for any runtime errors
   ```
3. Verify health endpoints:
   - API: http://localhost:3001/health
   - Discord: Check bot comes online
   - Twitch: Check bot connects
   - Runner Watcher: Check Twitch webhook registration
   - WS Relay: Check socket connections

#### Production Deployment
1. Push to `to-typescript` branch
2. Create PR for review
3. Test in staging environment if available
4. Deploy using existing deployment scripts

## Technical Decisions Made

### TypeScript Configuration
- **Target:** ES2022 for modern JavaScript features
- **Strict Mode:** Enabled for maximum type safety
- **Module Resolution:** CommonJS for Node.js compatibility
- **Source Maps:** Enabled for debugging
- **Declaration Files:** Generated for library usage

### Type Declaration Strategies
- **Custom Declarations:** Created for `node-twitch` library
- **Express Extensions:** Used declaration merging for custom properties
- **Gradual Migration:** Allowed for services with many files

### Git History Preservation
- Used `git mv` for most renames
- Some files showed as deleted/created due to significant changes
- Attempted separate commits for rename vs content changes

## Known Issues & Workarounds

### Git Rename Detection
- Files with >50% changes may not show as renamed
- Workaround: Separate commits for rename and TypeScript conversion
- Result: Some files still show as deleted/created on GitHub

### Mixed JavaScript/TypeScript Services
- API and Discord services have both .js and .ts files
- Dockerfiles configured to copy both source types
- TypeScript configured to allow JavaScript imports

### Library Type Support
- `node-twitch`: Created custom declarations in `/runnerwatcher/src/types/`
- All other libraries have proper TypeScript support

## Success Metrics
- [x] Shared types library created and used across services
- [x] No duplicate type definitions
- [x] All critical services have TypeScript entry points
- [x] Docker builds complete successfully
- [x] Development hot-reload maintained
- [ ] All JavaScript files converted (partial - ~60% complete)
- [ ] Full integration testing completed
- [ ] Production deployment successful

## Next Session Tasks
When resuming this migration:

1. **Complete Discord Bot Migration**
   - Convert event handler files to TypeScript
   - Convert command files to TypeScript
   - Test slash commands work correctly

2. **Complete API Service Migration**
   - Prioritize models with Mongoose typing
   - Convert routes with proper Express typing
   - Migrate remaining utility files

3. **Final Testing**
   - Run `pnpm boom` for full rebuild
   - Test all inter-service communication
   - Verify WebSocket events flow correctly
   - Check authentication flows

4. **Documentation Updates**
   - Update README with TypeScript information
   - Document any new development workflows
   - Update CLAUDE.md with TypeScript commands

## Estimated Time to Complete
- Discord bot completion: 2-3 hours
- API service completion: 4-6 hours
- Testing & debugging: 2-3 hours
- **Total remaining: 8-12 hours**

## Commands Reference
```bash
# Development
pnpm install          # Install dependencies
pnpm build           # Build TypeScript files
pnpm start           # Start all services
pnpm logs            # View service logs
pnpm boom            # Full rebuild and restart

# TypeScript specific
tsc --noEmit         # Type check without building
tsc --watch          # Watch mode for development
```

## Migration Branches
- Working branch: `to-typescript`
- Base branch: `main`
- PR will compare all changes for review