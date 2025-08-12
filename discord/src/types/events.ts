import { Client, Guild, Message } from "discord.js"
import { HelpaApi } from "helpa-api-client"

export interface DiscordEvent {
  name: string
  once?: boolean
  helpaApi?: HelpaApi
  execute: (...args: any[]) => Promise<void> | void
}
