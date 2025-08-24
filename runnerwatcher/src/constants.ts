export const Constants = Object.freeze({
  // Notification request headers
  TWITCH_MESSAGE_ID: "Twitch-Eventsub-Message-Id",
  TWITCH_MESSAGE_TIMESTAMP: "Twitch-Eventsub-Message-Timestamp",
  TWITCH_MESSAGE_SIGNATURE: "Twitch-Eventsub-Message-Signature",
  MESSAGE_TYPE: "Twitch-Eventsub-Message-Type",

  // Notification message types
  MESSAGE_TYPE_VERIFICATION: "webhook_callback_verification",
  MESSAGE_TYPE_NOTIFICATION: "notification",
  MESSAGE_TYPE_REVOCATION: "revocation",

  DELAY_FOR_API_SECONDS: 10,
  ALERT_DELAY_SECONDS: 15 * 60,
} as const)

export type ConstantsType = typeof Constants
