import { Command, TwitchStream, WebConfig } from "@helpasaur/types"

export const sizeStreamThumbnail = (
  url: string,
  width: number,
  height: number
) => {
  return url
    .replace("{width}", String(width))
    .replace("{height}", String(height))
}

export const getTwitchUrl = (username: string) => {
  return `https://twitch.tv/${username}`
}

export const getTwitchLoginUrl = () => {
  if (!process.env.TWITCH_APP_CLIENT_ID) {
    throw new Error(
      "TWITCH_APP_CLIENT_ID environment variable is not defined. Please set it during build time."
    )
  }
  if (!process.env.API_HOST) {
    throw new Error(
      "API_HOST environment variable is not defined. Please set it during build time."
    )
  }
  const TWITCH_APP_CLIENT_ID = process.env.TWITCH_APP_CLIENT_ID
  const TWITCH_APP_OAUTH_REDIRECT_URL = encodeURIComponent(
    String(process.env.API_HOST + "/auth/twitch")
  )
  return `https://id.twitch.tv/oauth2/authorize?client_id=${TWITCH_APP_CLIENT_ID}&redirect_uri=${TWITCH_APP_OAUTH_REDIRECT_URL}&response_type=code&scope=`
}

export const filterStreams = (streams: TwitchStream[], config: WebConfig) => {
  if (streams && streams.length > 0) {
    const { blacklistedUsers, channels, statusFilters } = config
    const speedrunTester = new RegExp(statusFilters, "i")
    const alertUserIds = channels.map((c) => c.id)
    let filteredAndOrderedStreams

    // 1. remove streams from users on the blacklist
    filteredAndOrderedStreams = streams.filter(
      (stream) => !blacklistedUsers.includes(stream.user_id)
    )

    // 2. attempt to filter out most non-speedrun streams
    filteredAndOrderedStreams = filteredAndOrderedStreams.filter(
      (stream) => !speedrunTester.test(stream.title)
    )

    // 3. feature streams that are in the alert list
    let featuredStreams = filteredAndOrderedStreams.filter((stream) =>
      alertUserIds.includes(stream.user_id)
    )
    featuredStreams = featuredStreams.map((s) => {
      s.isOnAlertsList = true
      return s
    })

    // 4. now create a merged list, with priorityStreams first, then anything in livestreams that isn't in topStreams
    let otherStreams = filteredAndOrderedStreams.filter((stream) => {
      let matchIndex = featuredStreams.findIndex((s) => {
        return s.id === stream.id
      })
      return matchIndex === -1
    })

    return { featured: featuredStreams, other: otherStreams }
  } else {
    return { featured: [], other: [] }
  }
}

export const sortCommandsAlpha = (commands: Array<Command>) => {
  commands.sort((a, b) => {
    if (a.command < b.command) {
      return -1
    }
    if (a.command > b.command) {
      return 1
    }
    return 0
  })
  return commands
}

export const openInNewTab = (url: string): void => {
  const newWindow = window.open(url, "_blank", "noopener,noreferrer")
  if (newWindow) newWindow.opener = null
}

export const onClickUrl =
  (url: string): (() => void) =>
  () =>
    openInNewTab(url)
