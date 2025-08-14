import {
  Client,
  Guild,
  Message,
  SlashCommandBuilder,
  ChatInputCommandInteraction,
} from "discord.js"
import { HelpaApi } from "@helpasaur/api-client"

export interface DiscordEvent {
  name: string
  once?: boolean
  helpaApi?: HelpaApi
  execute: (...args: any[]) => Promise<void> | void
}

export interface DiscordCommand {
  data: SlashCommandBuilder | any
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>
  helpaApi?: HelpaApi
}
