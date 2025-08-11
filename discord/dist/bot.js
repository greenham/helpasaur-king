"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiscordBot = void 0;
const discord_js_1 = require("discord.js");
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
class DiscordBot {
    constructor(config, helpaApi) {
        this.discordClient = new discord_js_1.Client({
            intents: [
                discord_js_1.GatewayIntentBits.Guilds,
                discord_js_1.GatewayIntentBits.GuildMessages,
                discord_js_1.GatewayIntentBits.MessageContent,
                discord_js_1.GatewayIntentBits.DirectMessages,
            ],
            partials: [discord_js_1.Partials.Channel],
        });
        this.discordClient.config = config;
        this.discordClient.commands = new discord_js_1.Collection();
        this.discordClient.setRandomActivity = () => {
            const activity = this.discordClient.config.activities[Math.floor(Math.random() * this.discordClient.config.activities.length)];
            console.log(`Setting Discord activity to: ${activity}`);
            this.discordClient.user?.setActivity(activity, {
                type: discord_js_1.ActivityType.Streaming,
                url: `https://twitch.tv/helpasaurking`,
            });
        };
        this.helpaApi = helpaApi;
        // Update service config every minute so we pick up guild changes quickly
        setInterval(() => {
            this.refreshConfig();
        }, 60000);
    }
    start() {
        // Log the bot in to Discord
        console.log(`Logging bot into Discord...`);
        this.discordClient.login(this.discordClient.config.token);
        // @TODO: Make sure the login succeeds before proceeding
        this.handleEvents();
        this.handleCommands();
    }
    refreshConfig() {
        this.helpaApi
            .getServiceConfig()
            .then((config) => {
            if (!config) {
                throw new Error(`Unable to refresh service config from API!`);
            }
            this.discordClient.config = config;
        })
            .catch((error) => {
            console.error("🛑 Error refreshing service config:", error);
        });
    }
    handleEvents() {
        // Read in events to be handled
        const eventsPath = node_path_1.default.join(__dirname, "events");
        const eventFiles = node_fs_1.default
            .readdirSync(eventsPath)
            .filter((file) => file.endsWith(".js") || file.endsWith(".ts"));
        for (const file of eventFiles) {
            const filePath = node_path_1.default.join(eventsPath, file);
            const event = require(filePath);
            event.helpaApi = this.helpaApi;
            if (event.once) {
                this.discordClient.once(event.name, (...args) => event.execute(...args));
            }
            else {
                this.discordClient.on(event.name, (...args) => event.execute(...args));
            }
        }
    }
    handleCommands() {
        // Read in commands to be handled
        const commandsPath = node_path_1.default.join(__dirname, "commands");
        const commandFiles = node_fs_1.default
            .readdirSync(commandsPath)
            .filter((file) => file.endsWith(".js") || file.endsWith(".ts"));
        for (const file of commandFiles) {
            const filePath = node_path_1.default.join(commandsPath, file);
            const command = require(filePath);
            command.helpaApi = this.helpaApi;
            // Set a new item in the Collection with the key as the command name and the value as the exported module
            if ("data" in command && "execute" in command) {
                this.discordClient.commands.set(command.data.name, command);
            }
            else {
                console.log(`⚠ The command at ${filePath} is missing a required "data" or "execute" property.`);
            }
        }
        this.discordClient.on(discord_js_1.Events.InteractionCreate, async (interaction) => {
            if (!interaction.isChatInputCommand())
                return;
            const command = this.discordClient.commands.get(interaction.commandName);
            if (!command) {
                console.error(`No command matching ${interaction.commandName} was found.`);
                return;
            }
            try {
                await command.execute(interaction);
            }
            catch (error) {
                console.error(error);
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({
                        content: "There was an error while executing this command!",
                        ephemeral: true,
                    });
                }
                else {
                    await interaction.reply({
                        content: "There was an error while executing this command!",
                        ephemeral: true,
                    });
                }
            }
        });
    }
}
exports.DiscordBot = DiscordBot;
//# sourceMappingURL=bot.js.map