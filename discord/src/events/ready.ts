import { EmbedBuilder, TextChannel } from "discord.js"
import * as schedule from "node-schedule"
import { io, Socket } from "socket.io-client"
import { DiscordEvent, ExtendedClient } from "../types"
import {
  GuildConfig,
  StreamAlertPayload,
  WeeklyRacePayload,
} from "@helpasaur/types"
import { config } from "../config"
const STREAM_ONLINE_EVENT = "stream.online"
const CHANNEL_UPDATE_EVENT = "channel.update"

// @TODO: Move all of this to db.configs.discord
const ALTTP_GUILD_ID = "138378732376162304"
const REZE_ID = "86234074175258624"
const LJ_SMILE_NAME = "ljSmile"
const WEEKLY_ALERT_OFFSET_MINUTES = 60
const WEEKLY_ALERT_MESSAGE =
  "The weekly Any% NMG Race is starting #startsIn# on <https://racetime.gg> | Create an account (or log in) here: <https://racetime.gg/account/auth> | ALttP races can be found here: <https://racetime.gg/alttp>"

const readyEvent: DiscordEvent<"ready"> = {
  name: "ready",
  once: true,
  execute(client) {
    const extClient = client as ExtendedClient
    console.log(`✅ Success! Logged in as ${extClient.user?.tag}`)

    // Connect to websocket relay to listen for events like stream alerts and race rooms
    const wsRelay: Socket = io(config.websocketRelayServer, {
      query: { clientId: `${config.packageName} v${config.packageVersion}` },
    })
    console.log(
      `Connecting to websocket relay server on port ${config.websocketRelayServer}...`
    )
    wsRelay.on("connect_error", (err: Error) => {
      console.log(`Connection error!`)
      console.log(err)
    })
    wsRelay.on("connect", () => {
      console.log(`✅ Connected! Socket ID: ${wsRelay.id}`)
    })

    // 1. Set up weekly alerts
    const timeToSchedule = {
      dayOfWeek: 0,
      hour: 11,
      minute: 0,
      tz: "America/Los_Angeles",
    }

    // !!!!!!!!!!!!!!!!! DEBUG ONLY !!!!!!!!!!!!!!!!!!!!!
    // timeToSchedule.dayOfWeek = 2;
    // timeToSchedule.hour = 18;
    // timeToSchedule.minute = 19;
    /////////////////////////////////////////////////////

    const weeklyAlertJob = schedule.scheduleJob(timeToSchedule, () => {
      console.log(`Sending weekly alerts!`)

      // Look up which guilds/channels/roles should be alerted
      const alerts = extClient.config.guilds
        .filter(
          (g: GuildConfig) =>
            g.active && g.enableWeeklyRaceAlert && g.weeklyRaceAlertChannelId
        )
        .map((g: GuildConfig) => {
          return {
            channelId: g.weeklyRaceAlertChannelId,
            roleId: g.weeklyRaceAlertRoleId,
          }
        })

      alerts.forEach(
        (a: {
          channelId: string | null | undefined
          roleId: string | null | undefined
        }) => {
          if (!a.channelId) return
          const channel = extClient.channels.cache.get(
            a.channelId
          ) as TextChannel
          if (!channel) return

          console.log(
            `Sending alert to to ${channel.guild.name} (#${channel.name})`
          )

          const notify = a.roleId ? `<@&${a.roleId}> ` : ""
          const startsIn = `<t:${Math.floor(
            (Date.now() + WEEKLY_ALERT_OFFSET_MINUTES * 60 * 1000) / 1000
          )}:R>`
          const alertMessage = WEEKLY_ALERT_MESSAGE.replace(
            "#startsIn#",
            startsIn
          )

          channel
            .send(notify + alertMessage)
            .then(() => {
              console.log(`-> Sent!`)

              // special message for reze in the alttp discord :)
              if (channel.guild.id === ALTTP_GUILD_ID) {
                const ljSmile = channel.guild.emojis.cache.find(
                  (emoji) => emoji.name === LJ_SMILE_NAME
                )
                channel.send(`<@${REZE_ID}> happy weekly ${ljSmile}`)
              }
            })
            .catch(console.error)
        }
      )

      console.log(
        `Next weekly alert scheduled for: ${weeklyAlertJob.nextInvocation()}`
      )
    })
    console.log(
      `Weekly alert scheduled for: ${weeklyAlertJob.nextInvocation()}`
    )
    ///////////////////////////////////////////////////////////////////////////

    // 2. Rotate activity
    extClient.setRandomActivity()
    const activityRotateJob = schedule.scheduleJob({ minute: 0 }, () => {
      extClient.setRandomActivity()
    })
    console.log(
      `Activity rotation scheduled for: ${activityRotateJob.nextInvocation()}`
    )
    ///////////////////////////////////////////////////////////////////////////

    // 3. Listen for stream alerts
    wsRelay.on(
      "streamAlert",
      ({
        payload: stream,
        source,
      }: {
        payload: StreamAlertPayload
        source: string
      }) => {
        if (
          ![STREAM_ONLINE_EVENT, CHANNEL_UPDATE_EVENT].includes(
            stream.eventType
          )
        ) {
          return
        }

        console.log("Received stream alert:", stream.eventType)

        // Get a list of guilds that have stream alerts enabled
        const alerts = extClient.config.guilds
          .filter(
            (g: GuildConfig) =>
              g.active && g.enableStreamAlerts && g.streamAlertsChannelId
          )
          .map((g: GuildConfig) => {
            return { channelId: g.streamAlertsChannelId }
          })

        console.log(`Found ${alerts.length} guilds to alert`)

        // Post a message to the configured channels with the stream event
        alerts.forEach((a: { channelId: string | null | undefined }) => {
          if (!a.channelId) return
          const channel = extClient.channels.cache.get(
            a.channelId
          ) as TextChannel
          if (!channel) return

          console.log(
            `Sending stream alert for ${stream.user.login} to ${channel.guild.name} (#${channel.name})`
          )

          const streamAlertEmbed = new EmbedBuilder()
            .setColor(0x6441a5)
            .setTitle(`Now live on Twitch!`)
            .setURL(`https://twitch.tv/${stream.user.login}`)
            .setAuthor({
              name: stream.user.display_name,
              iconURL: stream.user.profile_image_url,
              url: `https://twitch.tv/${stream.user.login}`,
            })
            .setDescription(stream.title)
            .setThumbnail(stream.user.profile_image_url || null)
            .setTimestamp()
            .setFooter({
              text: source,
              iconURL:
                "https://static.helpasaur.com/img/TwitchGlitchPurple.png",
            })

          if (
            stream.eventType === STREAM_ONLINE_EVENT &&
            stream.thumbnail_url
          ) {
            streamAlertEmbed.setImage(
              stream.thumbnail_url
                .replace("{width}", "1280")
                .replace("{height}", "720")
            )
          }

          if (stream.eventType === CHANNEL_UPDATE_EVENT) {
            streamAlertEmbed.setTitle(`Changed title:`)
          }

          channel
            .send({ embeds: [streamAlertEmbed] })
            .then(() => {
              console.log(`-> Sent!`)
            })
            .catch(console.error)
        })
      }
    )

    // 4. Listen for weekly race room creation
    wsRelay.on(
      "weeklyRaceRoomCreated",
      ({
        payload: raceData,
        source,
      }: {
        payload: WeeklyRacePayload
        source: string
      }) => {
        console.log("Received weekly race room event:", raceData)

        // Get a list of guilds that have race room alerts enabled
        const alerts = extClient.config.guilds
          .filter(
            (g: GuildConfig) =>
              g.active &&
              g.enableWeeklyRaceRoomAlert &&
              g.weeklyRaceAlertChannelId
          )
          .map((g: GuildConfig) => {
            return {
              channelId: g.weeklyRaceAlertChannelId,
              roleId: g.weeklyRaceAlertRoleId,
            }
          })

        console.log(`Found ${alerts.length} guilds to alert`)

        // Post a message to the configured channels with the race details
        alerts.forEach(
          (a: {
            channelId: string | null | undefined
            roleId: string | null | undefined
          }) => {
            if (!a.channelId) return
            const channel = extClient.channels.cache.get(
              a.channelId
            ) as TextChannel
            if (!channel) return

            console.log(
              `Sending weekly race room alert to ${channel.guild.name} (#${channel.name})`
            )

            const notify = a.roleId ? `<@&${a.roleId}> ` : ""
            const startsIn = `<t:${raceData.startTimestamp}:R>`
            const raceRoomUrl = raceData.raceRoomUrl

            const weeklyRaceAlertEmbed = new EmbedBuilder()
              .setColor(0x379c6f)
              .setTitle(`Weekly race room has been created!`)
              .setDescription(`Starts ${startsIn}`)
              .setURL(raceRoomUrl)
              .setAuthor({
                name: "hap e weekly",
                iconURL: "https://static.helpasaur.com/img/ljsmile.png",
                url: raceRoomUrl,
              })
              .addFields(
                { name: "Race room", value: raceRoomUrl },
                { name: "Goal", value: "Any% NMG" }
              )
              .setImage(
                "https://racetime.gg/media/The_Legend_of_Zelda__A_Link_to_the_Past-285x380_kyx6ga0.jpg"
              )
              .setTimestamp()
              .setFooter({
                text: source,
                iconURL: "https://static.helpasaur.com/img/ljsmile.png",
              })

            channel
              .send({ content: notify, embeds: [weeklyRaceAlertEmbed] })
              .then(() => {
                console.log(`-> Sent!`)
              })
              .catch(console.error)
          }
        )
      }
    )
  },
}

module.exports = readyEvent
