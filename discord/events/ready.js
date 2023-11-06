const { EmbedBuilder } = require("discord.js");
const schedule = require("node-schedule");
const { io } = require("socket.io-client");
const { STREAM_ALERTS_WEBSOCKET_SERVER } = process.env;
const STREAM_ONLINE_EVENT = "stream.online";
const CHANNEL_UPDATE_EVENT = "channel.update";
const packageJson = require("../package.json");

// @TODO: Move all of this to db.configs.discord
const ALTTP_GUILD_ID = "138378732376162304";
const REZE_ID = "86234074175258624";
const LJ_SMILE_NAME = "ljSmile";
const WEEKLY_ALERT_MESSAGE =
  "The weekly Any% NMG Race is starting in 1 Hour on <https://racetime.gg> | Create an account (or log in) here: <https://racetime.gg/account/auth> | ALttP races can be found here: <https://racetime.gg/alttp>";

module.exports = {
  name: "ready",
  once: true,
  execute(client) {
    console.log(`Ready! Logged in as ${client.user.tag}`);

    // 1. Set up weekly alerts
    let timeToSchedule = {
      dayOfWeek: 0,
      hour: 11,
      minute: 0,
      tz: "America/Los_Angeles",
    };

    // !!!!!!!!!!!!!!!!! DEBUG ONLY !!!!!!!!!!!!!!!!!!!!!
    // timeToSchedule.dayOfWeek = 2;
    // timeToSchedule.hour = 18;
    // timeToSchedule.minute = 19;
    /////////////////////////////////////////////////////

    const weeklyAlertJob = schedule.scheduleJob(timeToSchedule, () => {
      console.log(`Sending weekly alerts!`);

      // Look up which guilds/channels/roles should be alerted
      let alerts = client.config.guilds
        .filter((g) => g.enableWeeklyRaceAlert && g.weeklyRaceAlertChannelId)
        .map((g) => {
          return {
            channelId: g.weeklyRaceAlertChannelId,
            roleId: g.weeklyRaceAlertRoleId,
          };
        });

      alerts.forEach((a) => {
        let channel = client.channels.cache.get(a.channelId);
        if (!channel) return;

        console.log(
          `Sending alert to to ${channel.guild.name} (#${channel.name})`
        );

        let notify = a.roleId ? `<@&${a.roleId}> ` : "";

        channel
          .send(notify + WEEKLY_ALERT_MESSAGE)
          .then(() => {
            console.log(`-> Sent!`);

            // special message for reze in the alttp discord :)
            if (channel.guild.id == ALTTP_GUILD_ID) {
              let ljSmile = channel.guild.emojis.cache.find(
                (emoji) => emoji.name === LJ_SMILE_NAME
              );
              channel.send(`<@${REZE_ID}> happy weekly ${ljSmile}`);
            }
          })
          .catch(console.error);
      });
    });
    console.log(
      `Weekly alert scheduled, next invocation: ${weeklyAlertJob.nextInvocation()}`
    );
    ///////////////////////////////////////////////////////////////////////////

    // 2. Rotate activity
    client.setRandomActivity();
    const activityRotateJob = schedule.scheduleJob({ minute: 0 }, () => {
      client.setRandomActivity();
    });
    console.log(
      `Activity rotation scheduled, next invocation: ${activityRotateJob.nextInvocation()}`
    );
    ///////////////////////////////////////////////////////////////////////////

    // 3. Listen for stream alerts
    const streamAlerts = io(STREAM_ALERTS_WEBSOCKET_SERVER);
    console.log(`Trying to connect to ${STREAM_ALERTS_WEBSOCKET_SERVER}...`);
    streamAlerts.on("connect_error", (err) => {
      console.log(`Connection error!`);
      console.log(err);
    });
    streamAlerts.on("connect", () => {
      console.log(
        `Connected to stream alerts server: ${STREAM_ALERTS_WEBSOCKET_SERVER}`
      );
      console.log(`Socket ID: ${streamAlerts.id}`);
    });
    streamAlerts.on("streamAlert", (stream) => {
      if (
        ![STREAM_ONLINE_EVENT, CHANNEL_UPDATE_EVENT].includes(stream.eventType)
      ) {
        return;
      }

      console.log(`Received stream alert: ${stream.eventType}!`);

      // Get a list of guilds that have stream alerts enabled
      let alerts = client.config.guilds
        .filter((g) => g.enableStreamAlerts && g.streamAlertsChannelId)
        .map((g) => {
          return { channelId: g.streamAlertsChannelId };
        });

      // Post a message to the configured channels with the stream event
      alerts.forEach((a) => {
        let channel = client.channels.cache.get(a.channelId);
        if (!channel) return;

        console.log(
          `Sending stream alert to to ${channel.guild.name} (#${channel.name})`
        );

        let streamAlertEmbed = new EmbedBuilder()
          .setColor(0x6441a5)
          .setTitle(`Now live on Twitch!`)
          .setURL(`https://twitch.tv/${stream.user.login}`)
          .setAuthor({
            name: stream.user.display_name,
            iconURL: stream.user.profile_image_url,
            url: `https://twitch.tv/${stream.user.login}`,
          })
          .setDescription(stream.title)
          .setThumbnail(stream.user.profile_image_url)
          .setTimestamp()
          .setFooter({
            text: `runnerwatcher v${packageJson.version}`,
            iconURL: "https://helpasaur.com/img/TwitchGlitchPurple.png",
          });

        if (stream.eventType === STREAM_ONLINE_EVENT) {
          streamAlertEmbed.setImage(
            stream.thumbnail_url
              .replace("{width}", 1280)
              .replace("{height}", 720)
          );
        }

        if (stream.eventType === CHANNEL_UPDATE_EVENT) {
          streamAlertEmbed.setTitle(`Changed title:`);
        }

        channel
          .send({ embeds: [streamAlertEmbed] })
          .then(() => {
            console.log(`-> Sent!`);
          })
          .catch(console.error);
      });
    });
    streamAlerts.on("weeklyRaceRoomCreated", (raceRoomUrl) => {
      console.log(`Weekly race room has been created! ${raceRoomUrl}!`);

      // Get a list of guilds that have stream alerts enabled
      let alerts = client.config.guilds
        .filter((g) => g.enableStreamAlerts && g.streamAlertsChannelId)
        .map((g) => {
          return { channelId: g.streamAlertsChannelId };
        });

      // Post a message to the configured channels with the stream event
      alerts.forEach((a) => {
        let channel = client.channels.cache.get(a.channelId);
        if (!channel) return;

        console.log(
          `Sending stream alert to to ${channel.guild.name} (#${channel.name})`
        );

        let weeklyRaceAlertEmbed = new EmbedBuilder()
          .setColor(0x379c6f)
          .setTitle(`Weekly race room has been created!`)
          .setURL(raceRoomUrl)
          .setAuthor({
            name: "hap e weekly",
            iconURL: "https://helpasaur.com/img/ljsmile.png",
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
            text: `racebot v${packageJson.version}`,
            iconURL: "https://helpasaur.com/img/ljsmile.png",
          });

        channel
          .send({ embeds: [weeklyRaceAlertEmbed] })
          .then(() => {
            console.log(`-> Sent!`);
          })
          .catch(console.error);
      });
    });
  },
};
