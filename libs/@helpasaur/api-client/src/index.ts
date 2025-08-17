// Export the main HelpaApi class
export { HelpaApi } from "./client"

// Export route classes for advanced usage
export { ApiBase } from "./base"
export { CommandRoutes } from "./routes/commands"
export { TwitchRoutes } from "./routes/twitch"
export { DiscordRoutes } from "./routes/discord"
export { StreamAlertsRoutes } from "./routes/stream-alerts"
export { PracticeRoutes } from "./routes/practice"
export { StreamRoutes } from "./routes/streams"
export { WebRoutes } from "./routes/web"
export { UserRoutes } from "./routes/user"

// Export service configuration types
export * from "./types/services"
// Note: API data types are now exported from @helpasaur/types
