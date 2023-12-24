# Changelog

## 1.6.4

- Fix extraneous guard on twitch endpoint
- Better validation for command and alias uniqueness
- Better error handling for twitch bot actions

## 1.6.3

- Granularly guard endpoints via express-jwt-permissions

## 1.6.2

- Admins can now remove users from stream alerts via the web app

## 1.6.1

- Secure stream alerts endpoints
- Admins can now add users to stream alerts via the web app

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
