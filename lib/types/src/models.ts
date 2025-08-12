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
  username: string
  email?: string
  twitchId?: string
  twitchUsername?: string
  twitchAccessToken?: string
  twitchRefreshToken?: string
  avatar?: string
  role?: "user" | "admin" | "moderator"
  createdAt?: Date
  updatedAt?: Date
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

// Configuration Model
export interface IConfig {
  key: string
  value: any
  service?: string
  description?: string
}

export interface IConfigDocument extends IConfig, Document {}

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
