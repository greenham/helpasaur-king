import { Command, TwitchStream, StreamFilterConfig } from "@helpasaur/types"

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
  const twitchAppClientId = process.env.TWITCH_APP_CLIENT_ID
  const redirectUrl = encodeURIComponent(
    String(`${process.env.API_HOST}/auth/twitch`)
  )
  return `https://id.twitch.tv/oauth2/authorize?client_id=${twitchAppClientId}&redirect_uri=${redirectUrl}&response_type=code&scope=`
}

export const getLogoutUrl = (redirect?: string) => {
  if (!process.env.API_HOST) {
    throw new Error(
      "API_HOST environment variable is not defined. Please set it during build time."
    )
  }
  return (
    `${process.env.API_HOST}/auth/logout` +
    (redirect ? `?redirect=${encodeURIComponent(redirect)}` : "")
  )
}

export const filterStreams = (
  streams: TwitchStream[],
  config: StreamFilterConfig
) => {
  if (streams && streams.length > 0) {
    const { blacklistedUsers, channels, statusFilters } = config
    const speedrunTester = new RegExp(statusFilters, "i")
    const alertUserIds = channels.map((c) => c.id)
    let filteredAndOrderedStreams: TwitchStream[]

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
    const otherStreams = filteredAndOrderedStreams.filter((stream) => {
      const matchIndex = featuredStreams.findIndex((s) => {
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
