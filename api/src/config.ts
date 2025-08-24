import { name as packageName, version as packageVersion } from "../package.json"

/**
 * Validates and returns a required environment variable
 * Throws an error if the variable is not set
 */
function getRequiredEnv(key: string): string {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

/**
 * Returns an optional environment variable with a default value
 */
function getOptionalEnv(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue
}

/**
 * Application configuration loaded from environment variables
 * This is validated once at startup, providing type-safe access throughout the app
 */
export const config = {
  // Metadata
  packageName,
  packageVersion,

  // MongoDB
  mongodbUrl: getRequiredEnv("MONGODB_URL"),

  // Server
  port: parseInt(getOptionalEnv("PORT", "3001"), 10),

  // API
  apiKey: getRequiredEnv("API_KEY"),
  corsOriginsWhitelist: getOptionalEnv(
    "API_CORS_ORIGINS_WHITELIST",
    "http://localhost:3450,https://your-domain.com"
  ).split(","),

  // Service
  serviceName: getOptionalEnv("SERVICE_NAME", "api"),
  allowedServices: getOptionalEnv(
    "ALLOWED_SERVICES",
    "discord,twitch,runnerwatcher,racebot,ws-relay,streamAlerts"
  ).split(","),

  // Twitch
  twitchAppClientId: getRequiredEnv("TWITCH_APP_CLIENT_ID"),
  twitchAppClientSecret: getRequiredEnv("TWITCH_APP_CLIENT_SECRET"),
  twitchEventsubSecretKey: getRequiredEnv("TWITCH_EVENTSUB_SECRET_KEY"),
  twitchEventsubWebhookUrl: getRequiredEnv("TWITCH_EVENTSUB_WEBHOOK_URL"),

  // JWT
  jwtSecretKey: getRequiredEnv("JWT_SECRET_KEY"),
  jwtHeaderCookieName: getOptionalEnv("JWT_HEADER_COOKIE_NAME", "helpa-jwthp"),
  jwtFooterCookieName: getOptionalEnv("JWT_FOOTER_COOKIE_NAME", "helpa-jwts"),

  // Client
  apiHost: getRequiredEnv("API_HOST"),
  clientPostAuthRedirectUrl: getOptionalEnv(
    "CLIENT_POST_AUTH_REDIRECT_URL",
    "https://your-domain.com"
  ),

  // WebSocket
  websocketRelayServer: getOptionalEnv(
    "WEBSOCKET_RELAY_SERVER",
    "http://ws-relay:3003"
  ),

  // Environment
  nodeEnv: getOptionalEnv("NODE_ENV", "development"),
  isDevelopment: process.env.NODE_ENV !== "production",
  isProduction: process.env.NODE_ENV === "production",
} as const

// Validate config at module load time
// This will throw immediately if required env vars are missing
console.log(`✅ Config loaded for ${config.serviceName} service`)
