// Type declarations for node-twitch
declare module "node-twitch" {
  export interface StreamData {
    id: string
    user_id: string
    user_login: string
    user_name: string
    game_id: string
    game_name: string
    type: string
    title: string
    viewer_count: number
    started_at: string
    language: string
    thumbnail_url: string
    tag_ids: string[]
    is_mature: boolean
  }

  export interface UserData {
    id: string
    login: string
    display_name: string
    type: string
    broadcaster_type: string
    description: string
    profile_image_url: string
    offline_image_url: string
    view_count: number
    created_at: string
  }

  export interface EventSubSubscription {
    id: string
    status: string
    type: string
    version: string
    condition: any
    transport: any
    created_at: string
    cost: number
  }

  export default class TwitchApi {
    constructor(options: {
      client_id: string
      client_secret: string
      access_token?: string
      refresh_token?: string
    })

    getStreams(options?: any): Promise<{ data: StreamData[] }>
    getUsers(options?: any): Promise<{ data: UserData[] }>
    getEventSubSubscriptions(): Promise<{ data: EventSubSubscription[] }>
    addEventSubSubscription(options: any): Promise<any>
    removeEventSubSubscription(id: string): Promise<any>
    getAccessToken(): Promise<string>
  }
}
