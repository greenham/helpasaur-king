import { Document, Model } from "mongoose"

// Command Model
export interface ICommand {
  command: string
  aliases?: string[]
  response: string
  category?: string
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

export interface IUserDocument extends IUser, Document {}

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
  value: any
  service?: string
  description?: string
}

export interface IConfigDocument extends IConfig, Document {}

// Configuration Model (for specific configs like stream alerts)
export interface IConfiguration {
  config?: any
}

export interface IConfigurationDocument extends IConfiguration, Document {}

// Command Log Model
export interface ICommandLog {
  command: string
  username: string
  channel?: string
  platform: "discord" | "twitch"
  timestamp: Date
  response?: string
}

export interface ICommandLogDocument extends ICommandLog, Document {}

// Prac Lists Model
export interface IPracList {
  name: string
  items: string[]
  owner?: string
  public?: boolean
  createdAt?: Date
  updatedAt?: Date
}

export interface IPracListDocument extends IPracList, Document {}

// Stream Model (inferred from context)
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

// Race Model (inferred from racebot context)
export interface IRace {
  roomUrl?: string
  roomName?: string
  goal?: string
  startTime?: Date
  status?: string
  participants?: string[]
  createdAt?: Date
}
