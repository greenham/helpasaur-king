# Helpasaur King

A Discord and Twitch bot for the A Link to the Past speedrunning community.

**Global command list**: https://helpasaur.com/commands

# Features

## Discord Bot

- **Commands**: Simple call-and-response [commands](https://helpasaur.com/commands) (responds to DMs too!)
- **Stream alerts**: Posts go-lives for A Link to the Past Twitch streams
- **Race notifications**: Pings role for weekly race an hour before
- **Race room announcements**: Posts weekly race room details after [Race Bot](#race-bot) creates it

## Twitch Bot

- Simple call-and-response [commands](https://helpasaur.com/commands)
- **Per-channel customization**: Each streamer can configure the bot for their channel
  - **Custom command prefix**: Choose from `!`, `?`, `.`, `~`, `@`, `#`, `$`, `%`, `^`, `&`, `*`
  - **Commands toggle**: Enable/disable all bot commands
  - **Practice Lists**: Per-channel practice tracking system (see below)
- **Practice Lists**: Track and randomize practice items in your channel
  - `!pracadd <entry>` - Add a new practice item
  - `!pracrand` - Get a random practice item (no repeats)
  - `!praclist` - View all current practice items
  - `!pracdel <#>` - Delete a specific practice item by number
  - `!pracclear` - Clear all practice items
  - **Moderator access control**: Streamers can allow/disable mods to manage practice lists

## Web App

- **Command List**: https://helpasaur.com/commands
- **ALttP Stream Directory**: https://helpasaur.com/streams
- **Twitch Bot Management**: https://helpasaur.com/twitch
  - Log in with Twitch to manage the bot (join, leave, customizations, etc.)
  - **Full bot configuration**: Command prefix, enable/disable commands, practice lists
  - **Practice Lists management**: Toggle moderator access, view all commands
- **Discord Bot Info**: https://helpasaur.com/discord

## Race Bot

- **Weekly race automation**: Automatically creates [racetime.gg](https://racetime.gg) room for weekly race

# FAQ

## How do I get the bot to join/leave my Twitch channel?

There are two ways:

1. **Web App**: Go to https://helpasaur.com/twitch, log in with Twitch, and manage the bot there
2. **Twitch Chat**: Go to https://twitch.tv/helpasaurking and send `!join` or `!leave` in the chat

## How do I customize the bot for my channel?

1. **Join the bot** in your channel first (see above)
2. **Go to the web app**: Visit https://helpasaur.com/twitch and log in with Twitch
3. **Configure settings**: Change command prefix, toggle commands/practice lists, set moderator access
4. **Changes are instant**: All configuration updates take effect immediately in your channel

## What are Practice Lists and how do I use them?

Practice Lists help you track speedrun practice goals, routes, tricks, or any other items you want to work on:

1. **Enable Practice Lists**: Go to https://helpasaur.com/twitch and toggle Practice Lists on
2. **Add items**: Use `!pracadd <description>` to add practice items
3. **Get random practice**: Use `!pracrand` for a random item (won't repeat until you've seen them all)
4. **Manage your list**: Use `!praclist` to see all items, `!pracdel <#>` to remove specific items
5. **Moderator access**: Toggle whether your mods can also add/remove practice items

## How do I get the bot to join my Discord server?

See https://helpasaur.com/discord for the join link and commands to configure the bot.
