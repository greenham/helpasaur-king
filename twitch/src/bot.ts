import { io, Socket } from "socket.io-client"
import * as tmi from "tmi.js"
import * as crypto from "crypto"
import { Command, HelpaApi } from "@helpasaur/api-client"
import { TwitchBotConfig } from "./types"
import { version as packageVersion, name as packageName } from "../package.json"
import { DEFAULT_COMMAND_PREFIX } from "."
const { WEBSOCKET_RELAY_SERVER } = process.env

export type CachableCommand = Command & { staleAfter: number }

export class TwitchBot {
  config: TwitchBotConfig
  helpaApi: HelpaApi
  cooldowns: Map<string, number>
  cachedCommands: Map<string, CachableCommand>
  bot: tmi.Client
  wsRelay: Socket
  messages: { onJoin: string; onLeave: string }
  lastRandomRoomMap: Map<string, string>
  channelList: string[] = []
  activeChannels: any[] = []
  channelMap: Map<string, any> = new Map()
  constructor(config: TwitchBotConfig, helpaApi: HelpaApi, channels: string[]) {
    this.config = config
    this.helpaApi = helpaApi
    this.cooldowns = new Map()
    this.cachedCommands = new Map()
    this.lastRandomRoomMap = new Map()

    // @TODO: Replace HelpasaurKing with this.config.botDisplayName
    // @TODO: Replace prod URL with env appropriate URL
    this.messages = {
      onJoin: `👋 Hello, I'm HelpasaurKing and I'm very high in potassium... like a banana! 🍌 Commands: https://helpasaur.com/commands | Manage: https://helpasaur.com/twitch`,
      onLeave: `😭 Ok, goodbye forever. (jk, have me re-join anytime through https://helpasaur.com/twitch or my twitch chat using ${this.config.cmdPrefix || DEFAULT_COMMAND_PREFIX}join)`,
    }

    this.setActiveChannels(channels)

    this.bot = new tmi.Client({
      options: { debug: false },
      identity: {
        username: this.config.username,
        password: this.config.oauth,
      },
      channels: this.channelList,
    } as any)

    this.wsRelay = this.connectToRelay()
  }

  // {
  //    roomId: u.twitchUserData.id,
  //    channelName: u.twitchUserData.login,
  //    displayName: u.twitchUserData.display_name,
  //    active: true,
  //    commandPrefix: '!',
  //    textCommandCooldown: 10,
  //    practiceListsEnabled: true,
  //    allowModsToManagePracticeLists: true,
  //    createdAt: ISODate('2024-01-21T22:47:24.975Z'),
  //    lastUpdated: ISODate('2024-01-21T22:47:24.975Z')
  // }
  start() {
    this.bot.connect().catch(console.error)

    this.bot.on("message", this.handleMessage.bind(this))

    // Update active channels list every minute so we pick up config changes quickly
    setInterval(() => {
      this.refreshActiveChannels()
    }, 60000)
  }

  connectToRelay(): Socket {
    const relay = io(WEBSOCKET_RELAY_SERVER, {
      query: { clientId: `${packageName} v${packageVersion}` },
    })

    console.log(
      `Connecting to websocket relay server on port ${WEBSOCKET_RELAY_SERVER}...`
    )

    relay.on("connect_error", (err) => {
      console.log(`Connection error!`)
      console.log(err)
    })

    relay.on("connect", () => {
      console.log(`✅ Connected! Socket ID: ${relay?.id}`)
    })

    relay.on("joinChannel", this.handleJoinChannel.bind(this))
    relay.on("leaveChannel", this.handleLeaveChannel.bind(this))
    relay.on("configUpdate", this.handleConfigUpdate.bind(this))

    return relay
  }

  async handleMessage(channel, tags, message, self) {
    if (self) return

    // Handle commands in the bot's channel (using the global default command prefix)
    // - join, leave
    if (channel === `#${this.config.username}`) {
      if (!message.startsWith(this.config.cmdPrefix || DEFAULT_COMMAND_PREFIX))
        return
      const args = message.slice(1).split(" ")
      const commandNoPrefix = args.shift().toLowerCase()
      switch (commandNoPrefix) {
        case "join":
          let channelToJoin = tags.username

          if (args[0] && tags.mod) {
            channelToJoin = args[0].toLowerCase()
          }

          console.log(
            `Received request from ${tags.username} to join ${channelToJoin}`
          )

          if (this.channelList.includes(channelToJoin)) {
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

          this.bot.join(channelToJoin)
          this.channelList.push(channelToJoin)

          try {
            const result =
              await this.helpaApi.twitch.joinTwitchChannel(channelToJoin)

            if (result.twitchBotConfig?.roomId) {
              // update the local map with the new channel config
              this.channelMap.set(
                result.twitchBotConfig.roomId,
                result.twitchBotConfig
              )
            }

            console.log(`Result of /api/twitch/join: ${JSON.stringify(result)}`)
          } catch (err: any) {
            console.error(`Error calling /api/twitch/join: ${err.message}`)
          }
          break

        case "leave":
          let channelToLeave = tags.username

          if (args[0] && tags.mod) {
            channelToLeave = args[0].toLowerCase()
          }

          console.log(
            `Received request from ${tags.username} to leave ${channelToLeave}`
          )

          if (!this.channelList.includes(channelToLeave)) {
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

          this.bot.part(channelToLeave)

          this.channelList = this.channelList.filter(
            (c) => c !== channelToLeave
          )
          this.channelMap.delete(tags["room-id"])

          try {
            const result =
              await this.helpaApi.twitch.leaveTwitchChannel(channelToLeave)

            console.log(
              `Result of /api/twitch/leave: ${JSON.stringify(result)}`
            )
          } catch (err: any) {
            console.error(`Error calling /api/twitch/leave: ${err.message}`)
          }
          break
      }

      return
    }

    // Look up the config for this channel in the local cache
    const channelConfig = this.channelMap.get(tags["room-id"])
    if (!channelConfig) return

    if (!message.startsWith(channelConfig.commandPrefix)) return

    if (this.config.blacklistedUsers?.includes(tags.username)) {
      console.log(
        `Received command from blacklisted user ${tags.username} (${tags["user-id"]}) in ${channel}`
      )
      return
    }

    const args = message.slice(1).split(" ")
    const commandNoPrefix = args.shift().toLowerCase()

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
    if (toggleConfig && channelConfig.roomId === tags["user-id"]) {
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
      (channelConfig.roomId === tags["user-id"] ||
        (channelConfig.allowModsToManagePracticeLists && tags.mod === true))
    ) {
      const targetUser = tags["room-id"]
      const listName = "default"

      switch (commandNoPrefix) {
        case "pracadd":
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
            const response = await this.helpaApi.practice.addPracticeListEntry(
              targetUser,
              listName,
              entryName
            )
            // addPracticeListEntry now returns void and throws on error
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
        case "pracrand":
          console.log(
            `[${channel}] ${tags["display-name"]} used ${commandNoPrefix}`
          )

          try {
            // get their list
            const response = await this.helpaApi.practice.getPracticeList(
              targetUser,
              listName
            )
            const entries = response.entries

            // choose a random entry
            let randomIndex = Math.floor(Math.random() * entries.length)
            let randomEntry = entries[randomIndex]

            // if they have more than 2 entries, make sure we don't get the same one twice in a row
            if (entries.length > 2) {
              let lastRandomEntry = this.lastRandomRoomMap.get(channel)
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
        case "pracdel":
          const entryId = parseInt(args[0])
          console.log(
            `[${channel}] ${tags["display-name"]} used ${commandNoPrefix} with entry ID: ${entryId}`
          )
          try {
            const response =
              await this.helpaApi.practice.deletePracticeListEntry(
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
        case "praclist":
          console.log(
            `[${channel}] ${tags["display-name"]} used ${commandNoPrefix}`
          )
          try {
            const response = await this.helpaApi.practice.getPracticeList(
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
        case "pracclear":
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
            const response = await this.helpaApi.practice.clearPracticeList(
              targetUser,
              listName
            )
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

    // Check if commands are enabled for this channel
    if (!channelConfig.commandsEnabled) {
      console.log(
        `[${channel}] Commands are disabled, ignoring: ${commandNoPrefix}`
      )
      return
    }

    console.log(`[${channel}] ${tags["display-name"]}: ${commandNoPrefix}`)

    let resolvedCommand: CachableCommand | null = null

    const cachedCommand = this.cachedCommands.get(commandNoPrefix)
    if (
      !cachedCommand ||
      (cachedCommand && Date.now() > cachedCommand.staleAfter)
    ) {
      // no cache or cache expiration
      try {
        const findCommandResult =
          await this.helpaApi.commands.findCommand(commandNoPrefix)

        if (findCommandResult) {
          resolvedCommand = {
            ...findCommandResult,
            staleAfter: Date.now() + 10 * 60 * 1000,
          }
          this.cachedCommands.set(commandNoPrefix, resolvedCommand)
        }
      } catch (err) {
        console.error(`Error while fetching command: ${err}`)
        return
      }
    } else {
      resolvedCommand = cachedCommand
    }

    if (!resolvedCommand) return

    let onCooldown = false
    let cooldownKey = resolvedCommand.command + channel
    let timeUsed = this.cooldowns.get(cooldownKey)
    if (timeUsed) {
      let now = Date.now()
      if (now - timeUsed <= channelConfig.textCommandCooldown * 1000) {
        onCooldown =
          channelConfig.textCommandCooldown * 1000 - (now - timeUsed) > 0
      }
    }

    if (onCooldown !== false) {
      return
    }

    this.bot.say(channel, resolvedCommand.response).catch(console.error)

    this.cooldowns.set(cooldownKey, Date.now())

    let aliasUsed = ""
    if (
      resolvedCommand.aliases &&
      resolvedCommand.aliases.length > 0 &&
      resolvedCommand.aliases.includes(commandNoPrefix)
    ) {
      aliasUsed = commandNoPrefix
    }

    try {
      await this.helpaApi.commands.logCommandUsage({
        command: resolvedCommand.command,
        user: tags.username || "unknown",
        channel: channel,
        platform: "twitch",
        roomId: tags["room-id"],
      })
    } catch (err) {
      console.error(`Error while logging command: ${err}`)
    }
  }

  handleJoinChannel({ payload }) {
    const { channel } = payload
    console.log(`Received joinChannel event for: ${channel}`)
    if (this.channelList.includes(channel)) {
      console.log(`Already in #${channel}`)
      return
    }

    this.bot.join(channel).catch(console.error)
    this.bot.say(channel, this.messages.onJoin).catch(console.error)

    // update local configs
    this.refreshActiveChannels()

    console.log(`Joined #${channel}`)
  }

  handleLeaveChannel({ payload: channel }) {
    console.log(`Received leaveChannel event for ${channel}`)
    if (!this.channelList.includes(channel)) {
      console.log(`Not in #${channel}`)
      return
    }

    // say our goodbyes o/
    this.bot.say(channel, this.messages.onLeave).catch(console.error)
    this.bot.part(channel).catch(console.error)

    // update local configs
    this.refreshActiveChannels()

    console.log(`Left #${channel}`)
  }

  handleConfigUpdate({ payload }) {
    console.log(`Received configUpdate event for: ${payload.channelName}`)

    // Update the local channel configuration
    if (this.channelMap.has(payload.roomId)) {
      this.channelMap.set(payload.roomId, payload)
      console.log(`Updated configuration for #${payload.channelName}`)
    }
  }

  async handleToggleCommand(
    channel,
    tags,
    args,
    channelConfig,
    commandName,
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
        this.channelMap.set(tags["room-id"], channelConfig)

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
        this.channelMap.set(tags["room-id"], channelConfig)

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
    err: any,
    errorMessageBase: string,
    channel: string,
    tags: any,
    statusErrors: { [key: number]: string } | null = null
  ) {
    console.error(errorMessageBase)
    if (err.response) {
      console.error(
        `${err.response.status} Error: ${err.response.data.message}`
      )

      if (statusErrors && statusErrors[err.response.status]) {
        this.bot
          .say(
            channel,
            `@${tags["display-name"]} >> ${statusErrors[err.response.status]}`
          )
          .catch(console.error)
      } else {
        this.bot
          .say(
            channel,
            `@${tags["display-name"]} >> ${err.response.status} ${errorMessageBase}: ${err.response.data.message}`
          )
          .catch(console.error)
      }
    } else if (err.request) {
      console.error("No response received from API!")
      this.bot
        .say(
          channel,
          `@${tags["display-name"]} >> ${errorMessageBase}: Helpa might be asleep. ResidentSleeper`
        )
        .catch(console.error)
    } else {
      console.error(`Error during request setup: ${err.message}`)
      this.bot
        .say(
          channel,
          `@${tags["display-name"]} >> ${errorMessageBase}: ${err.message}`
        )
        .catch(console.error)
    }
  }

  refreshActiveChannels() {
    this.helpaApi.twitch
      .getActiveChannels()
      .then((response) => {
        if (!response) {
          throw new Error(`Unable to refresh active channel list from API!`)
        }

        this.setActiveChannels(response)
      })
      .catch((error) => {
        console.error("🛑 Error refreshing active channel list:", error)
      })
  }

  setActiveChannels(channels) {
    this.channelList = [
      this.config.username,
      ...channels.map((c) => c.channelName),
    ]
    this.channelMap = new Map()
    // map roomId => config
    channels.forEach((c) => {
      this.channelMap.set(c.roomId, c)
    })
  }
}
