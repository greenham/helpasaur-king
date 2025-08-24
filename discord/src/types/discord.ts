import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  Collection,
  Client,
  ClientEvents,
  Awaitable,
  SlashCommandSubcommandsOnlyBuilder,
  SlashCommandOptionsOnlyBuilder,
} from "discord.js"
import { HelpaApi } from "@helpasaur/api-client"
import { DiscordConfig } from "./config"

// Discord Event types with proper typing for event arguments
export interface DiscordEvent<
  K extends keyof ClientEvents = keyof ClientEvents,
> {
  name: K
  once?: boolean
  helpaApi?: HelpaApi
  execute: (...args: ClientEvents[K]) => Awaitable<void>
  filePath?: string
}

// Command builder types
export type CommandBuilder =
  | SlashCommandBuilder
  | SlashCommandSubcommandsOnlyBuilder
  | SlashCommandOptionsOnlyBuilder
  | Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">

export interface DiscordCommand {
  data: CommandBuilder
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>
  helpaApi?: HelpaApi
  filePath?: string
}

export interface ExtendedClient extends Client {
  config: DiscordConfig
  commands: Collection<string, DiscordCommand>
  setRandomActivity: () => void
}
