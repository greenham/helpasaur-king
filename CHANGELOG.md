# Changelog

## 1.6.0

- All services now use JWTs for the API just like users
- All endpoints are now secured with JWTs
- Users and services now use the same endpoint for Twitch actions
- Extracted Helpa API client into its own package
- Adjusted docker builds to make this package available
- Standardizing Twitch and Discord bot code
- Make toast alert text more readable

## 1.5.1

- Enforce command name uniqueness when creating
- Visual touches here and there, better error handling

## 1.5.0

- Users can now log in via Twitch OAuth flow
- Authenticated users can now manage the Twitch Bot
  - Request bot to join/leave
- Admin tools
  - Create/update/delete commands

## Lots of untracked changes before this
