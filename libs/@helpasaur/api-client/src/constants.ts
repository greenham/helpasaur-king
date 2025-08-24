/**
 * API Route Constants
 */

export const API_BASE = "/api"

export const ROUTES = {
  AUTH: `/auth`,
  COMMANDS: `${API_BASE}/commands`,
  CONFIGS: `${API_BASE}/configs`,
  DISCORD: `${API_BASE}/discord`,
  ME: `${API_BASE}/me`,
  PRAC: `${API_BASE}/prac`,
  STREAM_ALERTS: `${API_BASE}/streamAlerts`,
  STREAMS: `${API_BASE}/streams`,
  TEST_EVENTS: `${API_BASE}/testEvents`,
  TWITCH: `${API_BASE}/twitch`,
  WEB: `${API_BASE}/web`,
} as const
