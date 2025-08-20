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

  // Service
  serviceName: getOptionalEnv("SERVICE_NAME", "racebot"),

  // Health Check
  racebotHealthPort: parseInt(
    getOptionalEnv("RACEBOT_HEALTH_PORT", "3012"),
    10
  ),

  // WebSocket
  websocketRelayServer: getOptionalEnv(
    "WEBSOCKET_RELAY_SERVER",
    "http://ws-relay:3003"
  ),

  // Racetime Configuration
  racetimeBaseUrl: getRequiredEnv("RACETIME_BASE_URL"),
  racetimeHostname: getRequiredEnv("RACETIME_HOSTNAME"),
  racetimeWssUrl: getRequiredEnv("RACETIME_WSS_URL"),
  racetimeGameCategorySlugZ3: getRequiredEnv("RACETIME_GAME_CATEGORY_SLUG_Z3"),
  racetimeBotClientId: getRequiredEnv("RACETIME_BOT_CLIENT_ID"),
  racetimeBotClientSecret: getRequiredEnv("RACETIME_BOT_CLIENT_SECRET"),

  // Environment
  nodeEnv: getOptionalEnv("NODE_ENV", "development"),
  isDevelopment: process.env.NODE_ENV !== "production",
  isProduction: process.env.NODE_ENV === "production",
} as const

// Validate config at module load time
// This will throw immediately if required env vars are missing
console.log(`✅ Config loaded for ${config.serviceName} service`)
