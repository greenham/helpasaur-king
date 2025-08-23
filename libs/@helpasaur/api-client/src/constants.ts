/**
 * API Route Constants
 */

export const API_BASE = "/api"

export const ROUTES = {
  COMMANDS: `${API_BASE}/commands`,
  DISCORD: `${API_BASE}/discord`,
  TWITCH: `${API_BASE}/twitch`,
  STREAMS: `${API_BASE}/streams`,
  ME: `${API_BASE}/me`,
  WEB: `${API_BASE}/web`,
  CONFIGS: `${API_BASE}/configs`,
  PRAC: `${API_BASE}/prac`,
  STREAM_ALERTS: `${API_BASE}/streamAlerts`,
  TEST_EVENTS: `${API_BASE}/testEvents`,
} as const
