export interface TwitchAuthData {
  access_token: string
  expires_in: number
  refresh_token: string
  scope: string[]
  token_type: string
}

export interface TwitchUserData {
  id: string
  login: string
  display_name: string
  broadcaster_type?: string
  description?: string
  profile_image_url?: string
  offline_image_url?: string
  view_count?: number
  created_at?: Date
  auth: TwitchAuthData
}

export interface IUser {
  twitchUserData: TwitchUserData
  permissions: string[]
  lastLogin: Date
}
