import { Command } from "../types/commands";
import { TwitchStream, StreamAlertsConfig } from "../types/streams";

export const sizeStreamThumbnail = (
  url: string,
  width: number,
  height: number
) => {
  return url
    .replace("{width}", String(width))
    .replace("{height}", String(height));
};

export const getTwitchUrl = (username: string) => {
  return `https://twitch.tv/${username}`;
};

export const filterStreams = (
  streams: TwitchStream[],
  config: StreamAlertsConfig
) => {
  if (streams.length > 0) {
    const { blacklistedUsers, channels, statusFilters } = config;
    const speedrunTester = new RegExp(statusFilters, "i");
    const alertUserIds = channels.map((c) => c.id);
    let filteredAndOrderedStreams;

    // 1. remove streams from users on the blacklist
    filteredAndOrderedStreams = streams.filter(
      (stream) => !blacklistedUsers.includes(stream.user_id)
    );

    // 2. attempt to filter out most non-speedrun streams
    filteredAndOrderedStreams = filteredAndOrderedStreams.filter(
      (stream) => !speedrunTester.test(stream.title)
    );

    // 3. feature streams that are in the alert list
    let featuredStreams = filteredAndOrderedStreams.filter((stream) =>
      alertUserIds.includes(stream.user_id)
    );
    featuredStreams = featuredStreams.map((s) => {
      s.isOnAlertsList = true;
      return s;
    });

    // 4. now create a merged list, with priorityStreams first, then anything in livestreams that isn't in topStreams
    let otherStreams = filteredAndOrderedStreams.filter((stream) => {
      let matchIndex = featuredStreams.findIndex((s) => {
        return s.id === stream.id;
      });
      return matchIndex === -1;
    });

    return { featured: featuredStreams, other: otherStreams };
  } else {
    return { featured: [], other: [] };
  }
};

export const sortCommandsAlpha = (commands: Array<Command>) => {
  commands.sort((a, b) => {
    if (a.command < b.command) {
      return -1;
    }
    if (a.command > b.command) {
      return 1;
    }
    return 0;
  });
  return commands;
};
