// Data Transfer Objects for API communication
// These represent the public API contracts, not the internal database models

// Command DTO - What clients see
export interface CommandDTO {
  command: string
  aliases?: string[]
  response: string
  category?: string
  enabled: boolean
}

// User DTO - Public user information
export interface UserDTO {
  id: string
  username: string
  displayName: string
  profileImageUrl?: string
  permissions?: string[]
  twitchBotConfig?: {
    active?: boolean
    commandsEnabled?: boolean
    commandPrefix?: string
    textCommandCooldown?: number
    practiceListsEnabled?: boolean
    weeklyRaceAlertEnabled?: boolean
  }
}

// Stream DTO
export interface StreamDTO {
  username: string
  userId?: string
  title?: string
  game?: string
  viewers?: number
  thumbnailUrl?: string
  startedAt?: string
  isLive?: boolean
}

// Race DTO
export interface RaceDTO {
  roomUrl?: string
  roomName?: string
  goal?: string
  startTime?: string
  status?: string
  participants?: string[]
}

// Practice List DTO
export interface PracListDTO {
  name: string
  entries: string[]
}

// Command creation/update requests
export interface CommandCreateRequest {
  command: string
  aliases?: string[]
  response: string
  category?: string
  enabled?: boolean
}

export interface CommandUpdateRequest {
  aliases?: string[]
  response?: string
  category?: string
  enabled?: boolean
}

// Stream query parameters
export interface StreamQueryParams {
  isLive?: boolean
  game?: string
  username?: string
}
