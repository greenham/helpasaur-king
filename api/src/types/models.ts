import { Document, Model } from "mongoose"

// Command Model
export interface ICommand {
  command: string
  aliases?: string[]
  response: string
  category?: string // Keep for backward compatibility during migration
  tags?: string[] // New tagging system
  enabled: boolean
  deleted?: boolean
}

export interface ICommandDocument extends ICommand, Document {}

export interface ICommandModel extends Model<ICommandDocument> {
  findByNameOrAlias(command: string): Promise<ICommandDocument | null>
  isUnique(command: string, aliases?: string[]): Promise<boolean>
}

// User Model
export interface IUser {
  twitchUserData?: {
    id: string
    login: string
    display_name: string
    broadcaster_type?: string
    description?: string
    profile_image_url?: string
    offline_image_url?: string
    view_count?: number
    created_at?: Date
    auth?: {
      access_token?: string
      expires_at?: number
      refresh_token?: string
      scope?: string[]
      token_type?: string
    }
  }
  permissions?: string[]
  lastLogin?: Date
  twitchBotConfig?: {
    active?: boolean
    commandsEnabled?: boolean
    commandPrefix?: string
    textCommandCooldown?: number
    practiceListsEnabled?: boolean
    allowModsToManagePracticeLists?: boolean
    weeklyRaceAlertEnabled?: boolean
    createdAt?: Date
    lastUpdated?: Date
  }
}

export interface IUserDocument extends IUser, Document {
  _id: unknown // Mongoose ObjectId
}

// Account Model
export interface IAccount {
  provider: string
  providerAccountId: string
  userId: string
  accessToken?: string
  refreshToken?: string
  expiresAt?: number
}

export interface IAccountDocument extends IAccount, Document {}

// Configuration Model (for generic configs)
export interface IConfig {
  key: string
  value: unknown
  service?: string
  description?: string
}

export interface IConfigDocument extends IConfig, Document {}

// Configuration Model (for specific configs like stream alerts)
export interface IConfiguration {
  config?: Record<string, unknown>
}

export interface IConfigurationDocument extends IConfiguration, Document {}

// Command Log Model
export interface ICommandLog {
  createdAt: Date
  command: string
  alias?: string
  source: string
  username: string
  metadata?: Record<string, unknown>
}

export interface ICommandLogDocument extends ICommandLog, Document {}

// Practice Lists Model
export interface IPracLists {
  twitchUserId: string
  name: string
  entries: string[]
}

export interface IPracListsDocument extends IPracLists, Document {}

// Stream Model
export interface IStream {
  username: string
  userId?: string
  title?: string
  game?: string
  viewers?: number
  thumbnailUrl?: string
  startedAt?: Date
  endedAt?: Date
  platform?: "twitch"
  isLive?: boolean
}

export interface IStreamDocument extends IStream, Document {}

// Race Model
export interface IRace {
  roomUrl?: string
  roomName?: string
  goal?: string
  startTime?: Date
  status?: string
  participants?: string[]
  createdAt?: Date
}

export interface IRaceDocument extends IRace, Document {}
