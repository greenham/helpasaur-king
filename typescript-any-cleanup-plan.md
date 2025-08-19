# Plan: Resolve "Unexpected any" TypeScript Warnings

Found **131 instances** of "Unexpected any" across the codebase. Here's the plan to resolve them with proper types:

## Phase 1: Create Missing Core Types

### 1.1 WebSocket & Event Types
- **ws-relay/src/types.ts**: 
  - Replace `RelayData<T = any>` with proper generic constraints
  - Create specific payload types for each relay event

### 1.2 Discord Event Types  
- **discord/src/types/discord.ts**:
  - Replace `execute: (...args: any[])` with proper Discord.js event parameters
  - Replace `data: SlashCommandBuilder | any` with union of specific builder types

### 1.3 Twitch Event Types
- **Create new**: `libs/@helpasaur/types/src/twitch-events.ts`
  - Define TwitchEventSubNotification interface
  - Define TwitchWebhookEvent interface 
  - Define specific event payloads (stream.online, channel.update)

### 1.4 API Request/Response Types
- **libs/@helpasaur/types/src/api.ts**:
  - Replace `ApiResponse<T = any>` with better defaults
  - Replace `config: { [key: string]: any }` with specific config interfaces
  - Replace `metadata: any` with `Record<string, unknown>`

## Phase 2: Service-Specific Types

### 2.1 API Service (47 instances)
- **Routes**: Create specific request/response interfaces for each endpoint
- **Middleware**: Type Express req/res with proper generics
- **Models**: Replace model `any` types with proper interfaces
- **Utils**: Create specific utility function parameter types

### 2.2 Discord Service (25 instances)  
- **Guild configs**: Use existing `DiscordGuildConfig` type more consistently
- **Message handlers**: Type Discord.js events properly
- **Command execution**: Create command context interface

### 2.3 Twitch Service (7 instances)
- **Chat events**: Use TMI.js types properly
- **Bot responses**: Create chat response interface

### 2.4 Runner Watcher (4 instances)
- **Event notifications**: Use TwitchEventSubNotification interface
- **Webhook processing**: Type Twitch webhook payloads

## Phase 3: Library Updates

### 3.1 API Client Library (6 instances)
- **HTTP methods**: Use better generic constraints for request/response
- **Error handling**: Create proper error response types

### 3.2 Bot Common Library
- **Command interfaces**: Standardize command typing across bots
- **Utility functions**: Add proper parameter typing

## Implementation Strategy

### Existing Types to Leverage:
- `TwitchStreamData`, `TwitchUserData` from twitch-api-client
- `Command`, `GuildConfig`, `ApiResponse` from @helpasaur/types  
- `WatchedTwitchStream` from runnerwatcher
- Discord.js built-in types (`ChatInputCommandInteraction`, etc.)

### New Types Needed:
- TwitchEventSubNotification (for webhook payloads)
- StreamAlertPayload (for ws-relay events)
- CommandExecutionContext (for bot commands)
- ExpressRequestWithUser (for authenticated API routes)
- ConfigurationValue (for typed config objects)

### Priority Order:
1. **High Impact**: Core shared types (ws-relay, @helpasaur/types)
2. **Medium Impact**: Service-specific types (API routes, Discord events)
3. **Low Impact**: Utility functions and edge cases

This will eliminate all 131 "Unexpected any" warnings while maintaining type safety and leveraging existing type definitions where possible.

## Detailed Breakdown by File

### ws-relay/src/index.ts (1 instance)
- Line 89: `socket.on(event, (data: any)` → Use proper event payload types

### ws-relay/src/types.ts (1 instance)  
- Line 12: `RelayData<T = any>` → Use `RelayData<T = unknown>`

### discord/src/types/discord.ts (2 instances)
- Line 14: `execute: (...args: any[])` → Use Discord.js event parameter types
- Line 18: `data: SlashCommandBuilder | any` → Use proper command builder union

### libs/@helpasaur/types/src/api.ts (3 instances)
- Line 12: `ApiResponse<T = any>` → Use `ApiResponse<T = unknown>`
- Line 22: `config: { [key: string]: any }` → Use `Record<string, unknown>`
- Line 171: `metadata?: any` → Use `Record<string, unknown>`

### API Service Files (47 instances)
- Multiple route files need proper Express request/response typing
- Model files need specific interface definitions
- Utility functions need parameter typing

### Discord Service Files (25 instances)
- Event handlers need proper Discord.js event typing
- Command interactions need specific context types
- Guild configuration handling needs consistent typing

### Twitch Service Files (7 instances) 
- Chat event handlers need TMI.js types
- Bot response functions need proper return types

### Runner Watcher Files (4 instances)
- Webhook notification processing needs Twitch EventSub types
- Event emission needs proper payload typing

### Other Services (Various instances)
- Race bot, web app, and other services have scattered `any` usage
- Most can be resolved with existing or simple new interfaces