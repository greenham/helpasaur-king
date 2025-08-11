"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.TwitchBot = void 0;
const socket_io_client_1 = require("socket.io-client");
const tmi = __importStar(require("tmi.js"));
const packageJson = __importStar(require("../package.json"));
const { WEBSOCKET_RELAY_SERVER } = process.env;
class TwitchBot {
    constructor(config, helpaApi) {
        this.config = config;
        this.helpaApi = helpaApi;
        this.cooldowns = new Map();
        this.cachedCommands = new Map();
        this.bot = null;
        this.wsRelay = null;
        this.channelList = [];
        this.channelConfigMap = new Map();
        // @TODO: Replace HelpasaurKing with this.config.botDisplayName
        this.messages = {
            onJoin: `👋 Hello, I'm HelpasaurKing and I'm very high in potassium... like a banana! 🍌 Commands: https://helpasaur.com/commands | Manage: https://helpasaur.com/twitch`,
            onLeave: `😭 Ok, goodbye forever. (jk, have me re-join anytime through https://helpasaur.com/twitch or my twitch chat using ${this.config.cmdPrefix}join)`,
        };
    }
    start(channels) {
        this.setActiveChannels(channels);
        this.bot = new tmi.Client({
            options: { debug: false, skipMembership: true },
            identity: {
                username: this.config.username,
                password: this.config.oauth,
            },
            channels: [...this.channelList],
        });
        this.bot.connect().catch(console.error);
        this.bot.on("message", this.handleMessage.bind(this));
        this.wsRelay = (0, socket_io_client_1.io)(WEBSOCKET_RELAY_SERVER || "", {
            query: { clientId: `${packageJson.name} v${packageJson.version}` },
        });
        console.log(`Connecting to websocket relay server on port ${WEBSOCKET_RELAY_SERVER}...`);
        this.wsRelay.on("connect_error", (err) => {
            console.log(`Connection error!`);
            console.log(err);
        });
        this.wsRelay.on("connect", () => {
            console.log(`✅ Connected! Socket ID: ${this.wsRelay?.id}`);
        });
        this.wsRelay.on("joinChannel", this.handleJoinChannel.bind(this));
        this.wsRelay.on("leaveChannel", this.handleLeaveChannel.bind(this));
        this.wsRelay.on("configUpdate", this.handleConfigUpdate.bind(this));
        // Update active channels list every minute so we pick up config changes quickly
        setInterval(() => {
            this.refreshActiveChannels();
        }, 60000);
    }
    setActiveChannels(channels) {
        this.channelList = [];
        this.channelConfigMap.clear();
        channels.forEach((channel) => {
            if (channel.active) {
                this.channelList.push(channel.channelName);
                this.channelConfigMap.set(channel.channelName, channel);
            }
        });
    }
    async refreshActiveChannels() {
        try {
            const response = await this.helpaApi.getAxiosInstance().get("/api/configs/twitch/activeChannels");
            const channels = response.data;
            const newChannelList = channels
                .filter((c) => c.active)
                .map((c) => c.channelName);
            // Join new channels
            const channelsToJoin = newChannelList.filter((c) => !this.channelList.includes(c));
            for (const channel of channelsToJoin) {
                await this.bot?.join(channel);
            }
            // Leave removed channels
            const channelsToLeave = this.channelList.filter((c) => !newChannelList.includes(c));
            for (const channel of channelsToLeave) {
                await this.bot?.part(channel);
            }
            this.setActiveChannels(channels);
        }
        catch (error) {
            console.error("Error refreshing active channels:", error);
        }
    }
    async handleMessage(channel, tags, message, self) {
        if (self)
            return;
        // Handle commands in the bot's channel (using the global default command prefix)
        if (channel === `#${this.config.username}`) {
            if (!message.startsWith(this.config.cmdPrefix))
                return;
            const args = message.slice(1).split(" ");
            const commandNoPrefix = args.shift()?.toLowerCase();
            switch (commandNoPrefix) {
                case "join":
                    let channelToJoin = tags.username || "";
                    if (args[0] && tags.mod) {
                        channelToJoin = args[0].toLowerCase();
                    }
                    console.log(`Received request from ${tags.username} to join ${channelToJoin}`);
                    if (this.channelList.includes(channelToJoin)) {
                        await this.bot?.say(channel, `@${tags.username} I'm already in ${channelToJoin}'s channel!`);
                        return;
                    }
                    await this.handleJoinChannel({
                        payload: { channelName: channelToJoin },
                        source: "twitch-chat",
                    });
                    break;
                case "leave":
                    let channelToLeave = tags.username || "";
                    if (args[0] && tags.mod) {
                        channelToLeave = args[0].toLowerCase();
                    }
                    console.log(`Received request from ${tags.username} to leave ${channelToLeave}`);
                    if (!this.channelList.includes(channelToLeave)) {
                        await this.bot?.say(channel, `@${tags.username} I'm not in ${channelToLeave}'s channel!`);
                        return;
                    }
                    await this.handleLeaveChannel({
                        payload: { channelName: channelToLeave },
                        source: "twitch-chat",
                    });
                    break;
            }
            return;
        }
        // Handle commands in other channels
        const channelName = channel.slice(1); // Remove the # prefix
        const channelConfig = this.channelConfigMap.get(channelName);
        if (!channelConfig)
            return;
        const prefix = channelConfig.commandPrefix || this.config.cmdPrefix;
        if (!message.startsWith(prefix))
            return;
        const args = message.slice(prefix.length).split(" ");
        const commandName = args.shift()?.toLowerCase();
        if (!commandName)
            return;
        // Check cooldown
        const cooldownKey = `${channel}-${commandName}`;
        const now = Date.now();
        const cooldownEntry = this.cooldowns.get(cooldownKey);
        if (cooldownEntry && now - cooldownEntry.lastUsed < cooldownEntry.cooldown) {
            return; // Still in cooldown
        }
        // Get command from cache or API
        let command = this.cachedCommands.get(commandName);
        if (!command) {
            try {
                const response = await this.helpaApi.getAxiosInstance().get(`/api/commands/${commandName}`);
                command = response.data;
                if (command) {
                    this.cachedCommands.set(commandName, command);
                }
            }
            catch (error) {
                // Command not found
                return;
            }
        }
        if (command && command.enabled) {
            const cooldownMs = (command.cooldown || channelConfig.textCommandCooldown || 10) * 1000;
            this.cooldowns.set(cooldownKey, {
                lastUsed: now,
                cooldown: cooldownMs,
            });
            await this.bot?.say(channel, command.response);
        }
    }
    async handleJoinChannel(data) {
        const { channelName } = data.payload;
        try {
            await this.bot?.join(channelName);
            this.channelList.push(channelName);
            if (data.source === "twitch-chat") {
                await this.bot?.say(`#${channelName}`, this.messages.onJoin);
            }
            console.log(`✅ Joined channel: ${channelName}`);
        }
        catch (error) {
            console.error(`Error joining channel ${channelName}:`, error);
        }
    }
    async handleLeaveChannel(data) {
        const { channelName } = data.payload;
        try {
            if (data.source === "twitch-chat") {
                await this.bot?.say(`#${channelName}`, this.messages.onLeave);
            }
            await this.bot?.part(channelName);
            this.channelList = this.channelList.filter((c) => c !== channelName);
            this.channelConfigMap.delete(channelName);
            console.log(`✅ Left channel: ${channelName}`);
        }
        catch (error) {
            console.error(`Error leaving channel ${channelName}:`, error);
        }
    }
    handleConfigUpdate(data) {
        console.log("Config update received:", data);
        // Handle config updates as needed
    }
}
exports.TwitchBot = TwitchBot;
//# sourceMappingURL=bot.js.map