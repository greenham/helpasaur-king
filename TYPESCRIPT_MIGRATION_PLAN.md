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

## Current State Analysis

### Services to Migrate
- **API Service** (`/api/`) - 22 JS files
- **Discord Bot** (`/discord/`) - 10 JS files  
- **Twitch Bot** (`/twitch/`) - 2 JS files
- **Runner Watcher** (`/runnerwatcher/`) - 4 JS files
- **WebSocket Relay** (`/ws-relay/`) - 1 JS file
- **Shared Library** (`/lib/helpa-api-client/`) - 1 JS file

### Already in TypeScript
- **Race Bot** (`/racebot/`) ✅
- **Web App** (`/web/`) ✅

## Migration Phases

### Phase 1: Shared Library & Types Setup
1. **Create shared types library** (`/lib/helpa-types/`)
   - Define common interfaces for WebSocket events
   - Create types for API responses and requests
   - Define MongoDB model interfaces
   - Set up modern TypeScript configuration (ES2022+, strict mode)

2. **Migrate helpa-api-client library**
   - Convert to TypeScript with proper typing
   - Maintain backward compatibility for existing services
   - Export types for API client configuration and responses

### Phase 2: Core Service Migration (Order by dependency)

#### 2.1 WebSocket Relay Service
- **Files:** 1 (index.js)
- **Dependencies:** socket.io (has types)
- **Priority:** High (simple, good starting point)
- **Estimated time:** 1 hour

#### 2.2 API Service
- **Files:** 22 
- **Dependencies:** Express, Mongoose, Socket.io, JWT (all have types)
- **Priority:** Critical (core service)
- **Challenges:**
  - Mongoose model typing with static methods
  - Complex authentication flows
  - Twitch API interactions
- **Estimated time:** 4-5 hours

#### 2.3 Runner Watcher Service
- **Files:** 4
- **Dependencies:** node-twitch (no types), Socket.io, Express
- **Priority:** Medium
- **Challenges:**
  - Need custom type declarations for node-twitch
- **Estimated time:** 2 hours

#### 2.4 Twitch Bot Service
- **Files:** 2
- **Dependencies:** tmi.js (has @types/tmi.js)
- **Priority:** Medium
- **Estimated time:** 1-2 hours

#### 2.5 Discord Bot Service
- **Files:** 10
- **Dependencies:** discord.js v14 (built-in TypeScript support)
- **Priority:** Medium
- **Challenges:**
  - Slash command typing
  - Event handler patterns
- **Estimated time:** 2-3 hours

### Phase 3: Build System Updates
1. **Update Dockerfiles**
   - Add TypeScript build step for each service
   - Follow pattern from racebot Dockerfile

2. **Update package.json scripts**
   - Add `build` script for TypeScript compilation
   - Update `start` scripts to use compiled output
   - Configure `start:dev` with ts-node for development

3. **Development environment setup**
   - Configure nodemon with ts-node for hot-reload
   - Update .gitignore for build outputs

## Implementation Guidelines

### TypeScript Configuration
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./build",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

### Migration Rules
1. **File Conversion:** Use `git mv` to rename .js to .ts files
2. **Type Safety:** Start with strict mode, use `any` only when necessary
3. **Shared Types:** Place all shared interfaces in `/lib/helpa-types/`
4. **No Business Logic Changes:** Maintain exact functionality
5. **Testing:** Test each service after migration before moving to next

## Risk Analysis

### Low Risk ✅
- Most dependencies have TypeScript support
- Established pattern from racebot service
- Docker build process proven with TypeScript

### Medium Risk ⚠️
- **node-twitch library:** No official types available
  - *Mitigation:* Create custom type declarations
- **Build time increase:** TypeScript compilation overhead
  - *Mitigation:* Use build caching in Docker
- **Development workflow:** Hot-reload configuration
  - *Mitigation:* Configure nodemon with ts-node

### High Risk 🔴
- **Mongoose schema typing:** Complex static methods and virtuals
  - *Mitigation:* Use Mongoose's TypeScript guide, type incrementally
- **Service startup order:** Build dependencies in Docker
  - *Mitigation:* Careful dependency management in docker-compose

## Dependency TypeScript Support Status

| Package | TypeScript Support | Notes |
|---------|-------------------|-------|
| express | ✅ @types/express | |
| mongoose | ✅ Built-in | v8+ has native TS support |
| socket.io | ✅ Built-in | |
| socket.io-client | ✅ Built-in | |
| discord.js | ✅ Built-in | v14 has full TS support |
| tmi.js | ✅ @types/tmi.js | |
| jsonwebtoken | ✅ @types/jsonwebtoken | |
| axios | ✅ Built-in | |
| cors | ✅ @types/cors | |
| morgan | ✅ @types/morgan | |
| node-schedule | ✅ @types/node-schedule | |
| node-twitch | ❌ No types | Need custom declarations |
| ms | ✅ @types/ms | |

## Estimated Timeline

| Phase | Task | Estimated Time |
|-------|------|---------------|
| Phase 1 | Shared types library setup | 1-2 hours |
| Phase 1 | helpa-api-client migration | 1 hour |
| Phase 2 | WebSocket Relay | 1 hour |
| Phase 2 | API Service | 4-5 hours |
| Phase 2 | Runner Watcher | 2 hours |
| Phase 2 | Twitch Bot | 1-2 hours |
| Phase 2 | Discord Bot | 2-3 hours |
| Phase 3 | Build system updates | 1-2 hours |
| Testing | Integration testing | 2-3 hours |
| **Total** | | **15-20 hours** |

## Success Criteria
- [ ] All JavaScript files converted to TypeScript
- [ ] No runtime behavior changes
- [ ] All services start successfully
- [ ] Docker builds complete without errors
- [ ] Development hot-reload working
- [ ] Shared types eliminate duplication
- [ ] Strict TypeScript mode enabled

## Next Steps
1. Create `/lib/helpa-types/` directory and initial setup
2. Begin with WebSocket Relay (simplest service)
3. Progress through services in dependency order
4. Update build system after each service
5. Run full integration tests after completion