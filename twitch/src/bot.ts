import { io, Socket } from "socket.io-client"
import * as tmi from "tmi.js"
import * as packageJson from "../package.json"
import { HelpaApi } from "helpa-api-client"

const { WEBSOCKET_RELAY_SERVER } = process.env

interface TwitchBotConfig {
  username: string
  oauth: string
  cmdPrefix: string
  botDisplayName?: string
  textCommandCooldown?: number
  [key: string]: any
}

interface TwitchChannel {
  roomId: string
  channelName: string
  displayName: string
  active: boolean
  commandPrefix: string
  textCommandCooldown: number
  practiceListsEnabled: boolean
  allowModsToManagePracticeLists: boolean
  createdAt: Date
  lastUpdated: Date
}

interface Command {
  command: string
  response: string
  enabled: boolean
  cooldown?: number
  [key: string]: any
}

interface CooldownEntry {
  lastUsed: number
  cooldown: number
}

export class TwitchBot {
  private config: TwitchBotConfig
  private helpaApi: HelpaApi
  private cooldowns: Map<string, CooldownEntry>
  private cachedCommands: Map<string, Command>
  public bot: tmi.Client | null
  private wsRelay: Socket | null
  private messages: {
    onJoin: string
    onLeave: string
  }
  public channelList: string[]
  private channelConfigMap: Map<string, TwitchChannel>

  constructor(config: TwitchBotConfig, helpaApi: HelpaApi) {
    this.config = config
    this.helpaApi = helpaApi
    this.cooldowns = new Map()
    this.cachedCommands = new Map()
    this.bot = null
    this.wsRelay = null
    this.channelList = []
    this.channelConfigMap = new Map()
    // @TODO: Replace HelpasaurKing with this.config.botDisplayName
    this.messages = {
      onJoin: `👋 Hello, I'm HelpasaurKing and I'm very high in potassium... like a banana! 🍌 Commands: https://helpasaur.com/commands | Manage: https://helpasaur.com/twitch`,
      onLeave: `😭 Ok, goodbye forever. (jk, have me re-join anytime through https://helpasaur.com/twitch or my twitch chat using ${this.config.cmdPrefix}join)`,
    }
  }

  start(channels: TwitchChannel[]) {
    this.setActiveChannels(channels)
    this.bot = new tmi.Client({
      options: { debug: false, skipMembership: true },
      identity: {
        username: this.config.username,
        password: this.config.oauth,
      },
      channels: [...this.channelList],
    })

    this.bot.connect().catch(console.error)

    this.bot.on("message", this.handleMessage.bind(this))

    this.wsRelay = io(WEBSOCKET_RELAY_SERVER || "", {
      query: { clientId: `${packageJson.name} v${packageJson.version}` },
    })

    console.log(
      `Connecting to websocket relay server on port ${WEBSOCKET_RELAY_SERVER}...`
    )

    this.wsRelay.on("connect_error", (err: Error) => {
      console.log(`Connection error!`)
      console.log(err)
    })

    this.wsRelay.on("connect", () => {
      console.log(`✅ Connected! Socket ID: ${this.wsRelay?.id}`)
    })

    this.wsRelay.on("joinChannel", this.handleJoinChannel.bind(this))
    this.wsRelay.on("leaveChannel", this.handleLeaveChannel.bind(this))
    this.wsRelay.on("configUpdate", this.handleConfigUpdate.bind(this))

    // Update active channels list every minute so we pick up config changes quickly
    setInterval(() => {
      this.refreshActiveChannels()
    }, 60000)
  }

  private setActiveChannels(channels: TwitchChannel[]) {
    this.channelList = []
    this.channelConfigMap.clear()
    
    channels.forEach((channel) => {
      if (channel.active) {
        this.channelList.push(channel.channelName)
        this.channelConfigMap.set(channel.channelName, channel)
      }
    })
  }

  private async refreshActiveChannels() {
    try {
      const response = await this.helpaApi.getAxiosInstance().get("/api/configs/twitch/activeChannels")
      const channels = response.data
      
      const newChannelList = channels
        .filter((c: TwitchChannel) => c.active)
        .map((c: TwitchChannel) => c.channelName)
      
      // Join new channels
      const channelsToJoin = newChannelList.filter((c: string) => !this.channelList.includes(c))
      for (const channel of channelsToJoin) {
        await this.bot?.join(channel)
      }
      
      // Leave removed channels
      const channelsToLeave = this.channelList.filter((c: string) => !newChannelList.includes(c))
      for (const channel of channelsToLeave) {
        await this.bot?.part(channel)
      }
      
      this.setActiveChannels(channels)
    } catch (error) {
      console.error("Error refreshing active channels:", error)
    }
  }

  private async handleMessage(
    channel: string,
    tags: tmi.ChatUserstate,
    message: string,
    self: boolean
  ): Promise<void> {
    if (self) return

    // Handle commands in the bot's channel (using the global default command prefix)
    if (channel === `#${this.config.username}`) {
      if (!message.startsWith(this.config.cmdPrefix)) return
      const args = message.slice(1).split(" ")
      const commandNoPrefix = args.shift()?.toLowerCase()
      
      switch (commandNoPrefix) {
        case "join":
          let channelToJoin = tags.username || ""

          if (args[0] && tags.mod) {
            channelToJoin = args[0].toLowerCase()
          }

          console.log(
            `Received request from ${tags.username} to join ${channelToJoin}`
          )

          if (this.channelList.includes(channelToJoin)) {
            await this.bot?.say(
              channel,
              `@${tags.username} I'm already in ${channelToJoin}'s channel!`
            )
            return
          }

          await this.handleJoinChannel({
            payload: { channelName: channelToJoin },
            source: "twitch-chat",
          })
          break

        case "leave":
          let channelToLeave = tags.username || ""

          if (args[0] && tags.mod) {
            channelToLeave = args[0].toLowerCase()
          }

          console.log(
            `Received request from ${tags.username} to leave ${channelToLeave}`
          )

          if (!this.channelList.includes(channelToLeave)) {
            await this.bot?.say(
              channel,
              `@${tags.username} I'm not in ${channelToLeave}'s channel!`
            )
            return
          }

          await this.handleLeaveChannel({
            payload: { channelName: channelToLeave },
            source: "twitch-chat",
          })
          break
      }
      return
    }

    // Handle commands in other channels
    const channelName = channel.slice(1) // Remove the # prefix
    const channelConfig = this.channelConfigMap.get(channelName)
    if (!channelConfig) return

    const prefix = channelConfig.commandPrefix || this.config.cmdPrefix
    if (!message.startsWith(prefix)) return

    const args = message.slice(prefix.length).split(" ")
    const commandName = args.shift()?.toLowerCase()
    if (!commandName) return

    // Check cooldown
    const cooldownKey = `${channel}-${commandName}`
    const now = Date.now()
    const cooldownEntry = this.cooldowns.get(cooldownKey)
    
    if (cooldownEntry && now - cooldownEntry.lastUsed < cooldownEntry.cooldown) {
      return // Still in cooldown
    }

    // Get command from cache or API
    let command = this.cachedCommands.get(commandName)
    if (!command) {
      try {
        const response = await this.helpaApi.getAxiosInstance().post(`/api/commands/find`, {
          command: commandName
        })
        if (response.status === 200) {
          command = response.data
          if (command) {
            this.cachedCommands.set(commandName, command)
          }
        }
      } catch (error) {
        // Command not found
        return
      }
    }

    if (command && command.enabled) {
      const cooldownMs = (command.cooldown || channelConfig.textCommandCooldown || 10) * 1000
      this.cooldowns.set(cooldownKey, {
        lastUsed: now,
        cooldown: cooldownMs,
      })

      await this.bot?.say(channel, command.response)
    }
  }

  private async handleJoinChannel(data: { payload: { channelName: string }; source: string }) {
    const { channelName } = data.payload
    
    try {
      await this.bot?.join(channelName)
      this.channelList.push(channelName)
      
      if (data.source === "twitch-chat") {
        await this.bot?.say(`#${channelName}`, this.messages.onJoin)
      }
      
      console.log(`✅ Joined channel: ${channelName}`)
    } catch (error) {
      console.error(`Error joining channel ${channelName}:`, error)
    }
  }

  private async handleLeaveChannel(data: { payload: { channelName: string }; source: string }) {
    const { channelName } = data.payload
    
    try {
      if (data.source === "twitch-chat") {
        await this.bot?.say(`#${channelName}`, this.messages.onLeave)
      }
      
      await this.bot?.part(channelName)
      this.channelList = this.channelList.filter((c) => c !== channelName)
      this.channelConfigMap.delete(channelName)
      
      console.log(`✅ Left channel: ${channelName}`)
    } catch (error) {
      console.error(`Error leaving channel ${channelName}:`, error)
    }
  }

  private handleConfigUpdate(data: any) {
    console.log("Config update received:", data)
    // Handle config updates as needed
  }
}