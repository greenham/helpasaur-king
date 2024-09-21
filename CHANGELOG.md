# Changelog

## 1.8.1

- Pinned mongo version to 7-jammy to resolve issue with upgrading to 8
- Resolved dependabot alerts for various packages

## 1.8.0

### Twitch Bot

- Support for per-channel configurations! 🥳
  - Instead of just joining a static list of channels, the Twitch Bot will now join _users_ who have the bot active. 😲
  - This opens up the ability for users to configure the bot specifically for their channel instead of being tied to the global defaults
  - The ability to change these values is not exposed _yet_, but will eventually be through chat commands as well as the web UI.
  - Users will **eventually** be able to control things like:
    - **Command prefix** _(free yourself from the shackles of `!`)_
    - **Enable/disable commands** _(if you just want the bot to shut up for a bit, but don't want to kick it out)_
    - **Enable/disable practice lists** _(still in BETA from 1.7.2, but will soon be opt-in for all!)_
    - **Enable/disable weekly race alerts** _(will post the race room link in your chat ~30 minutes before the weekly starts)_
  - This also resolves the issue of the bot being orphaned after username changes!
- `!pracrand` will no longer return the same room twice in a row as long as there are more than 2 items in the list

## 1.7.3

- Support search links with hash locations e.g. [https://helpasaur.com/commands#tutorial](https://helpasaur.com/commands#tutorial)

## 1.7.2

- [BETA] Support per-channel practice lists via Twitch chat commands
  - Can be used by the broadcaster and mods
  - Currently only enabled for a few select channels during beta
  - Commands:
    - `!pracadd <entry>` -- adds a new entry to the list
    - `!pracrand` -- supplies a random entry from the list
    - `!praclist` -- returns the entire list
    - `!pracdel <#>` -- deletes a specific entry in the list
    - `!pracclear` -- clears the entire list

## 1.7.1

- Support activating / de-activating discord bot (soft delete on guildDelete)

## 1.7.0

- Added support for users to self-manage the discord bot
  - Added page at https://helpasaur.com/discord with instructions and command list
  - Support configuration through slash commands (server owners only to start)

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
