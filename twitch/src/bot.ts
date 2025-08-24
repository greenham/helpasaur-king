import { io, Socket } from "socket.io-client"
import * as tmi from "tmi.js"
import * as crypto from "crypto"
import { HelpaApi, ApiError } from "@helpasaur/api-client"
import { getCachedCommand, CachableCommand } from "@helpasaur/bot-common"
import {
  ActiveChannelList,
  RelayEvent,
  TwitchBotChannelActionType,
  TwitchBotConfig,
} from "@helpasaur/types"
import { TwitchBotServiceConfig } from "./types"
import { DEFAULT_COMMAND_PREFIX } from "."
import { config } from "./config"
const { packageName, packageVersion, websocketRelayServer } = config

export class TwitchBot {
  config: TwitchBotServiceConfig
  helpaApi: HelpaApi
  activeChannels: ActiveChannelList
  cooldowns: Map<string, number>
  cachedCommands: Map<string, CachableCommand>
  bot: tmi.Client
  wsRelay: Socket
  messages: { onJoin: string; onLeave: string }
  lastRandomRoomMap: Map<string, string>

  constructor(
    config: TwitchBotServiceConfig,
    helpaApi: HelpaApi,
    channels: ActiveChannelList
  ) {
    this.config = config
    this.helpaApi = helpaApi
    this.activeChannels = channels
    this.cooldowns = new Map()
    this.cachedCommands = new Map()
    this.lastRandomRoomMap = new Map()

    // @TODO: Replace HelpasaurKing with this.config.botDisplayName
    // @TODO: Replace prod URL with env appropriate URL
    this.messages = {
      onJoin: `👋 Hello, I'm HelpasaurKing and I'm very high in potassium... like a banana! 🍌 Commands: https://helpasaur.com/commands | Manage: https://helpasaur.com/twitch`,
      onLeave: `😭 Ok, goodbye forever. (jk, have me re-join anytime through https://helpasaur.com/twitch or my twitch chat using ${this.config.cmdPrefix || DEFAULT_COMMAND_PREFIX}join)`,
    }

    this.bot = new tmi.Client({
      options: { debug: false },
      identity: {
        username: this.config.username,
        password: this.config.oauth,
      },
      channels: this.getActiveChannelsList(),
    })

    this.wsRelay = this.connectToRelay()
  }

  start() {
    this.bot.connect().catch(console.error)

    this.bot.on("message", this.handleMessage.bind(this))

    // Update active channels list every minute so we pick up config changes quickly
    setInterval(() => {
      this.refreshActiveChannels()
    }, 60000)
  }

  connectToRelay(): Socket {
    const relay = io(websocketRelayServer, {
      query: { clientId: `${packageName} v${packageVersion}` },
    })

    console.log(
      `Connecting to websocket relay server on port ${websocketRelayServer}...`
    )

    relay.on("connect_error", (err) => {
      console.log(`Connection error!`)
      console.log(err)
    })

    relay.on("connect", () => {
      console.log(`✅ Connected! Socket ID: ${relay?.id}`)
    })

    relay.on(RelayEvent.JOIN_TWITCH_CHANNEL, this.handleJoinChannel.bind(this))
    relay.on(
      RelayEvent.LEAVE_TWITCH_CHANNEL,
      this.handleLeaveChannel.bind(this)
    )
    relay.on(
      RelayEvent.TWITCH_BOT_CONFIG_UPDATED,
      this.handleConfigUpdate.bind(this)
    )

    return relay
  }

  async handleMessage(channel: string, tags, message: string, self) {
    if (self) return

    const userLogin = channel.replace("#", "").toLowerCase()

    // Handle commands in the bot's channel (using the global default command prefix)
    // - join, leave
    if (userLogin === this.config.username.toLowerCase()) {
      if (!message.startsWith(this.config.cmdPrefix || DEFAULT_COMMAND_PREFIX))
        return
      const args = message.slice(1).split(" ")
      const commandNoPrefix = String(args.shift()).toLowerCase()
      switch (commandNoPrefix) {
        case TwitchBotChannelActionType.JOIN: {
          let channelToJoin = tags.username

          if (args[0] && tags.mod) {
            channelToJoin = args[0].toLowerCase()
          }

          console.log(
            `Received request from ${tags.username} to join ${channelToJoin}`
          )

          if (this.getActiveChannelsList().includes(channelToJoin)) {
            return this.bot
              .say(
                channel,
                `@${tags["display-name"]} >> I am already in ${channelToJoin}!`
              )
              .catch(console.error)
          }

          this.bot
            .say(
              channel,
              `@${tags["display-name"]} >> Joining ${channelToJoin}... please mod ${this.config.username} to avoid accidental timeouts or bans!`
            )
            .catch(console.error)

          try {
            const result =
              await this.helpaApi.twitch.joinTwitchChannel(channelToJoin)
            console.log(
              `Result of joining #${channelToJoin}: ${JSON.stringify(result)}`
            )
          } catch (err) {
            const error = err as Error
            console.error(
              `Error attempting to join twitch channel #${channelToJoin}: ${error.message}`
            )
          }
          break
        }

        case TwitchBotChannelActionType.LEAVE: {
          let channelToLeave = tags.username

          if (args[0] && tags.mod) {
            channelToLeave = args[0].toLowerCase()
          }

          console.log(
            `Received request from ${tags.username} to leave ${channelToLeave}`
          )

          if (!this.getActiveChannelsList().includes(channelToLeave)) {
            return this.bot
              .say(
                channel,
                `@${tags["display-name"]} >> I am not in ${channelToLeave}!`
              )
              .catch(console.error)
          }

          this.bot
            .say(
              channel,
              `@${tags["display-name"]} >> Leaving ${channelToLeave}... use ${this.config.cmdPrefix || DEFAULT_COMMAND_PREFIX}join in this channel to re-join at any time!`
            )
            .catch(console.error)

          try {
            const result =
              await this.helpaApi.twitch.leaveTwitchChannel(channelToLeave)

            console.log(
              `Result of leaving #${channelToLeave}: ${JSON.stringify(result)}`
            )
          } catch (err) {
            const error = err as Error
            console.error(
              `Error attempting to leave twitch channel #${channelToLeave}: ${error.message}`
            )
          }
          break
        }
      }

      return
    }

    // Look up the config for this channel in the local cache
    const channelConfig = this.activeChannels[channel.replace("#", "")]
    if (!channelConfig) return

    if (!message.startsWith(channelConfig.commandPrefix)) return

    if (this.config.blacklistedUsers?.includes(tags.username)) {
      console.log(
        `Received command from blacklisted user ${tags.username} (${tags["user-id"]}) in ${channel}`
      )
      return
    }

    const args = message.slice(1).split(" ")
    const commandNoPrefix = String(args.shift()).toLowerCase()

    // Define toggle command configurations
    const toggleCommands = {
      praclists: {
        configField: "practiceListsEnabled",
        featureName: "Practice lists",
        statusMessages: {
          enabled: () =>
            ` Commands: ${channelConfig.commandPrefix}pracadd, ${channelConfig.commandPrefix}pracrand, ${channelConfig.commandPrefix}praclist, ${channelConfig.commandPrefix}pracdel, ${channelConfig.commandPrefix}pracclear`,
          disabled: () => "",
        },
        enabledMessage: () =>
          `Practice lists enabled! Commands: ${channelConfig.commandPrefix}pracadd <entry>, ${channelConfig.commandPrefix}pracrand, ${channelConfig.commandPrefix}praclist, ${channelConfig.commandPrefix}pracdel <#>, ${channelConfig.commandPrefix}pracclear`,
        disabledMessage: () => "Practice lists disabled.",
      },
      pracmods: {
        configField: "allowModsToManagePracticeLists",
        featureName: "Mod access for practice lists",
        statusMessages: {
          enabled: () => " Mods can manage practice lists.",
          disabled: () => " Only you can manage practice lists.",
        },
        enabledMessage: () =>
          "Mod access for practice lists enabled! Mods can now use practice list commands.",
        disabledMessage: () =>
          "Mod access for practice lists disabled. Only you can manage practice lists now.",
      },
    }

    // Handle toggle commands - only broadcaster can toggle these settings
    const toggleConfig = toggleCommands[commandNoPrefix]
    if (toggleConfig && userLogin === tags.username) {
      await this.handleToggleCommand(
        channel,
        tags,
        args,
        channelConfig,
        commandNoPrefix,
        toggleConfig
      )
      return
    }

    // Handle practice list commands if they're enabled for this channel
    // - By default, only the broadcaster can use these commands
    // - But mods can optionally be allowed to use them if configured
    // - Commands will only apply to the channel in which they are issued
    if (
      channelConfig.practiceListsEnabled &&
      (userLogin === tags.username ||
        (channelConfig.allowModsToManagePracticeLists && tags.mod === true))
    ) {
      const targetUser = tags["room-id"]
      const listName = "default"

      switch (commandNoPrefix) {
        case "pracadd": {
          if (args.length === 0) {
            this.bot
              .say(
                channel,
                `@${tags["display-name"]} >> You must specify an entry name! e.g. ${channelConfig.commandPrefix}pracadd gtower mimics`
              )
              .catch(console.error)
            return
          }

          const entryName = args.join(" ")
          console.log(
            `[${channel}] ${tags["display-name"]} used ${commandNoPrefix} with entry: ${entryName}`
          )

          try {
            await this.helpaApi.prac.addPracticeListEntry(
              targetUser,
              listName,
              entryName
            )
            console.log("Entry added successfully!")
            this.bot
              .say(channel, "Entry added successfully!")
              .catch(console.error)
            return
          } catch (err) {
            this.handleApiError(
              err,
              "Error adding entry to practice list",
              channel,
              tags
            )
            return
          }
        }
        case "pracrand": {
          console.log(
            `[${channel}] ${tags["display-name"]} used ${commandNoPrefix}`
          )

          try {
            // get their list
            const response = await this.helpaApi.prac.getPracticeList(
              targetUser,
              listName
            )
            const entries = response.entries

            // choose a random entry
            let randomIndex = Math.floor(Math.random() * entries.length)
            let randomEntry = entries[randomIndex]

            // if they have more than 2 entries, make sure we don't get the same one twice in a row
            if (entries.length > 2) {
              const lastRandomEntry = this.lastRandomRoomMap.get(channel)
              while (
                crypto.createHash("md5").update(randomEntry).digest("hex") ===
                lastRandomEntry
              ) {
                randomIndex = Math.floor(Math.random() * entries.length)
                randomEntry = entries[randomIndex]
              }
            }

            this.bot
              .say(
                channel,
                `Practice this: ${randomEntry} [${randomIndex + 1}]`
              )
              .catch(console.error)

            // remember the last random entry we gave them
            this.lastRandomRoomMap.set(
              channel,
              crypto.createHash("md5").update(randomEntry).digest("hex")
            )
            return
          } catch (err) {
            this.handleApiError(
              err,
              "Error fetching random entry from practice list",
              channel,
              tags,
              {
                404: `No entries found in practice list! Add one using ${channelConfig.commandPrefix}pracadd <entry name>`,
              }
            )
            return
          }
        }
        case "pracdel": {
          const entryId = parseInt(args[0])
          console.log(
            `[${channel}] ${tags["display-name"]} used ${commandNoPrefix} with entry ID: ${entryId}`
          )
          try {
            await this.helpaApi.prac.deletePracticeListEntry(
              targetUser,
              listName,
              entryId
            )
            const message = "Entry deleted successfully!"
            console.log(message)
            this.bot.say(channel, message).catch(console.error)
            return
          } catch (err) {
            this.handleApiError(
              err,
              `Error removing entry #${entryId} from practice list`,
              channel,
              tags
            )
            return
          }
        }
        case "praclist": {
          console.log(
            `[${channel}] ${tags["display-name"]} used ${commandNoPrefix}`
          )
          try {
            const response = await this.helpaApi.prac.getPracticeList(
              targetUser,
              listName
            )
            if (response.entries && response.entries.length > 0) {
              this.bot
                .say(
                  channel,
                  response.entries
                    .map((e, idx) => `[${idx + 1}] ${e}`)
                    .join(" | ")
                )
                .catch(console.error)
            } else {
              this.bot
                .say(
                  channel,
                  `No entries found in practice list! Add one using ${channelConfig.commandPrefix}pracadd <entry name>`
                )
                .catch(console.error)
            }
            return
          } catch (err) {
            this.handleApiError(
              err,
              "Error fetching practice list",
              channel,
              tags,
              {
                404: `No entries found in practice list! Add one using ${channelConfig.commandPrefix}pracadd <entry name>`,
              }
            )
            return
          }
        }
        case "pracclear": {
          if (targetUser !== tags["user-id"]) {
            this.bot
              .say(
                channel,
                `@${tags["display-name"]} >> Only the broadcaster can clear their practice list!`
              )
              .catch(console.error)
            return
          }

          console.log(
            `[${channel}] ${tags["display-name"]} used ${commandNoPrefix}`
          )

          try {
            await this.helpaApi.prac.clearPracticeList(targetUser, listName)
            const message = "Practice list cleared successfully!"
            this.bot.say(channel, message).catch(console.error)
            return
          } catch (err) {
            this.handleApiError(
              err,
              "Error clearing practice list",
              channel,
              tags,
              {
                404: `Nothing to clear!`,
              }
            )
            return
          }
        }
      }
    }

    // Check if commands are enabled for this channel
    if (!channelConfig.commandsEnabled) {
      console.log(
        `[${channel}] Commands are disabled, ignoring: ${commandNoPrefix}`
      )
      return
    }

    console.log(`[${channel}] ${tags["display-name"]}: ${commandNoPrefix}`)

    const command = await getCachedCommand(
      commandNoPrefix,
      this.cachedCommands,
      this.helpaApi
    )

    if (!command) return

    let onCooldown = false
    const cooldownKey = command.command + channel
    const timeUsed = this.cooldowns.get(cooldownKey)
    if (timeUsed) {
      const now = Date.now()
      if (now - timeUsed <= channelConfig.textCommandCooldown * 1000) {
        onCooldown =
          channelConfig.textCommandCooldown * 1000 - (now - timeUsed) > 0
      }
    }

    if (onCooldown !== false) {
      return
    }

    this.bot.say(channel, command.response).catch(console.error)

    this.cooldowns.set(cooldownKey, Date.now())

    let aliasUsed = ""
    if (
      command.aliases &&
      command.aliases.length > 0 &&
      command.aliases.includes(commandNoPrefix)
    ) {
      aliasUsed = commandNoPrefix
    }

    try {
      await this.helpaApi.commands.logCommandUsage({
        command: command.command,
        alias: aliasUsed,
        source: "twitch",
        username: tags.username,
        metadata: {
          channel,
          tags,
        },
      })
    } catch (err) {
      console.error(`Error while logging command: ${err}`)
    }
  }

  handleJoinChannel({ payload }) {
    const { channel } = payload
    console.log(`Received joinChannel event for: ${channel}`)
    if (this.getActiveChannelsList().includes(channel)) {
      console.log(`Already in #${channel}`)
      return
    }

    // say hello o/
    this.bot.join(channel).catch(console.error)
    this.bot.say(channel, this.messages.onJoin).catch(console.error)

    // update local configs
    this.refreshActiveChannels()

    console.log(`Joined #${channel}`)
  }

  handleLeaveChannel({ payload }) {
    const { channel } = payload
    console.log(`Received leaveChannel event for ${channel}`)
    if (!this.getActiveChannelsList().includes(channel)) {
      console.log(`Not in #${channel}`)
      return
    }

    // say our goodbyes o7
    this.bot.say(channel, this.messages.onLeave).catch(console.error)
    this.bot.part(channel).catch(console.error)

    // update local configs
    this.refreshActiveChannels()

    console.log(`Left #${channel}`)
  }

  handleConfigUpdate({ payload }) {
    console.log(`Received config update event for: ${payload.channel}`)
    if (!Object.hasOwnProperty.call(this.activeChannels, payload.channel)) {
      console.error(`No active channel found matching: ${payload.channel}!`)
      return
    }

    // Update the local channel configuration
    this.activeChannels[payload.channel] = payload.config
    console.log(`Updated configuration for #${payload.channel}`)
  }

  async handleToggleCommand(
    channel: string,
    tags,
    args: string[],
    channelConfig: TwitchBotConfig,
    commandName: string,
    toggleConfig
  ) {
    const subCommand = args[0]?.toLowerCase()
    const currentValue = channelConfig[toggleConfig.configField]

    if (!subCommand) {
      // Show current status and help
      const status = currentValue ? "enabled" : "disabled"
      const additionalInfo = currentValue
        ? toggleConfig.statusMessages.enabled()
        : toggleConfig.statusMessages.disabled()

      this.bot
        .say(
          channel,
          `@${tags["display-name"]} >> ${toggleConfig.featureName} ${status === "enabled" ? "are" : "is"} currently ${status}.${additionalInfo} | Toggle: ${channelConfig.commandPrefix}${commandName} on/off`
        )
        .catch(console.error)
      return
    }

    if (subCommand === "on") {
      if (currentValue) {
        this.bot
          .say(
            channel,
            `@${tags["display-name"]} >> ${toggleConfig.featureName} ${currentValue ? "are" : "is"} already enabled!`
          )
          .catch(console.error)
        return
      }

      console.log(`[${channel}] Enabling ${toggleConfig.featureName}...`)

      try {
        await this.helpaApi.twitch.updateTwitchBotConfig({
          [toggleConfig.configField]: true,
        })

        // Update local config
        channelConfig[toggleConfig.configField] = true
        this.activeChannels[channel] = channelConfig

        this.bot
          .say(
            channel,
            `@${tags["display-name"]} >> ${toggleConfig.enabledMessage()}`
          )
          .catch(console.error)
      } catch (err) {
        this.handleApiError(
          err,
          `Error enabling ${toggleConfig.featureName}`,
          channel,
          tags
        )
      }
      return
    }

    if (subCommand === "off") {
      if (!currentValue) {
        this.bot
          .say(
            channel,
            `@${tags["display-name"]} >> ${toggleConfig.featureName} ${currentValue ? "are" : "is"} already disabled!`
          )
          .catch(console.error)
        return
      }

      console.log(`[${channel}] Disabling ${toggleConfig.featureName}...`)

      try {
        await this.helpaApi.twitch.updateTwitchBotConfig({
          [toggleConfig.configField]: false,
        })

        // Update local config
        channelConfig[toggleConfig.configField] = false
        this.activeChannels[channel] = channelConfig

        this.bot
          .say(
            channel,
            `@${tags["display-name"]} >> ${toggleConfig.disabledMessage()}`
          )
          .catch(console.error)
      } catch (err) {
        this.handleApiError(
          err,
          `Error disabling ${toggleConfig.featureName}`,
          channel,
          tags
        )
      }
      return
    }

    // Invalid subcommand
    this.bot
      .say(
        channel,
        `@${tags["display-name"]} >> Invalid command. Use ${channelConfig.commandPrefix}${commandName} on/off to toggle ${toggleConfig.featureName.toLowerCase()}.`
      )
      .catch(console.error)
  }

  handleApiError(
    err: unknown,
    errorMessageBase: string,
    channel: string,
    tags: Record<string, unknown>,
    statusErrors: { [key: number]: string } | null = null
  ) {
    console.error(errorMessageBase)
    const error = err as ApiError<{ message: string }>
    if (error.response) {
      console.error(
        `${error.response.status} Error: ${error.response.data.message}`
      )

      if (statusErrors && statusErrors[error.response.status]) {
        this.bot
          .say(
            channel,
            `@${tags["display-name"]} >> ${statusErrors[error.response.status]}`
          )
          .catch(console.error)
      } else {
        this.bot
          .say(
            channel,
            `@${tags["display-name"]} >> ${error.response.status} ${errorMessageBase}: ${error.response.data.message}`
          )
          .catch(console.error)
      }
    } else if (error.request) {
      console.error("No response received from API!")
      this.bot
        .say(
          channel,
          `@${tags["display-name"]} >> ${errorMessageBase}: Helpa might be asleep. ResidentSleeper`
        )
        .catch(console.error)
    } else {
      console.error(`Error during request setup: ${error.message}`)
      this.bot
        .say(
          channel,
          `@${tags["display-name"]} >> ${errorMessageBase}: ${error.message}`
        )
        .catch(console.error)
    }
  }

  async refreshActiveChannels() {
    await this.helpaApi.configs
      .getActiveTwitchBotChannels()
      .then((activeChannels) => {
        this.activeChannels = activeChannels
      })
      .catch((error) => {
        console.error("🛑 Error refreshing active channel list:", error)
      })
  }

  getActiveChannelsList() {
    // join the bot's own channel by default, then all the active channels
    return [this.config.username, ...Object.keys(this.activeChannels)]
  }
}
