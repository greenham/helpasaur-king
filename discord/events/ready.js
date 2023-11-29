const { EmbedBuilder } = require("discord.js");
const schedule = require("node-schedule");
const { io } = require("socket.io-client");
const { WEBSOCKET_RELAY_SERVER } = process.env;
const STREAM_ONLINE_EVENT = "stream.online";
const CHANNEL_UPDATE_EVENT = "channel.update";
const packageJson = require("../package.json");

// @TODO: Move all of this to db.configs.discord
const ALTTP_GUILD_ID = "138378732376162304";
const REZE_ID = "86234074175258624";
const LJ_SMILE_NAME = "ljSmile";
const WEEKLY_ALERT_OFFSET_MINUTES = 60;
const WEEKLY_ALERT_MESSAGE =
  "The weekly Any% NMG Race is starting #startsIn# on <https://racetime.gg> | Create an account (or log in) here: <https://racetime.gg/account/auth> | ALttP races can be found here: <https://racetime.gg/alttp>";

module.exports = {
  name: "ready",
  once: true,
  execute(client) {
    console.log(`✅ Success! Logged in as ${client.user.tag}`);

    // Connect to websocket relay to listen for events like stream alerts and race rooms
    const wsRelay = io(WEBSOCKET_RELAY_SERVER, {
      query: { clientId: `${packageJson.name} v${packageJson.version}` },
    });
    console.log(
      `Connecting to websocket relay server on port ${WEBSOCKET_RELAY_SERVER}...`
    );
    wsRelay.on("connect_error", (err) => {
      console.log(`Connection error!`);
      console.log(err);
    });
    wsRelay.on("connect", () => {
      console.log(`✅ Connected! Socket ID: ${wsRelay.id}`);
    });

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
        let startsIn = `<t:${Math.floor(
          (Date.now() + WEEKLY_ALERT_OFFSET_MINUTES * 60 * 1000) / 1000
        )}:R>`;
        let alertMessage = WEEKLY_ALERT_MESSAGE.replace("#startsIn#", startsIn);

        channel
          .send(notify + alertMessage)
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

      console.log(
        `Next weekly alert scheduled for: ${weeklyAlertJob.nextInvocation()}`
      );
    });
    console.log(
      `Weekly alert scheduled for: ${weeklyAlertJob.nextInvocation()}`
    );
    ///////////////////////////////////////////////////////////////////////////

    // 2. Rotate activity
    client.setRandomActivity();
    const activityRotateJob = schedule.scheduleJob({ minute: 0 }, () => {
      client.setRandomActivity();
    });
    console.log(
      `Activity rotation scheduled for: ${activityRotateJob.nextInvocation()}`
    );
    ///////////////////////////////////////////////////////////////////////////

    // 3. Listen for stream alerts
    wsRelay.on("streamAlert", ({ payload: stream, source }) => {
      if (
        ![STREAM_ONLINE_EVENT, CHANNEL_UPDATE_EVENT].includes(stream.eventType)
      ) {
        return;
      }

      console.log("Received stream alert:", stream.eventType);

      // Get a list of guilds that have stream alerts enabled
      let alerts = client.config.guilds
        .filter((g) => g.enableStreamAlerts && g.streamAlertsChannelId)
        .map((g) => {
          return { channelId: g.streamAlertsChannelId };
        });

      console.log(`Found ${alerts.length} guilds to alert`);

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
            text: source,
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

    // 4. Listen for weekly race room creation
    wsRelay.on("weeklyRaceRoomCreated", ({ payload: raceData, source }) => {
      console.log("Received weekly race room event:", raceData);

      // Get a list of guilds that have race room alerts enabled
      let alerts = client.config.guilds
        .filter(
          (g) => g.enableWeeklyRaceRoomAlert && g.weeklyRaceRoomAlertChannelId
        )
        .map((g) => {
          return {
            channelId: g.weeklyRaceRoomAlertChannelId,
            roleId: g.weeklyRaceAlertRoleId || false,
          };
        });

      console.log(`Found ${alerts.length} guilds to alert`);

      // Post a message to the configured channels with the race details
      alerts.forEach((a) => {
        let channel = client.channels.cache.get(a.channelId);
        if (!channel) return;

        console.log(
          `Sending weekly race room alert to ${channel.guild.name} (#${channel.name})`
        );

        let notify = a.roleId ? `<@&${a.roleId}> ` : "";
        let startsIn = `<t:${raceData.startTimestamp}:R>`;
        let raceRoomUrl = raceData.raceRoomUrl;

        let weeklyRaceAlertEmbed = new EmbedBuilder()
          .setColor(0x379c6f)
          .setTitle(`Weekly race room has been created!`)
          .setDescription(`Starts ${startsIn}`)
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
            text: source,
            iconURL: "https://helpasaur.com/img/ljsmile.png",
          });

        channel
          .send({ content: notify, embeds: [weeklyRaceAlertEmbed] })
          .then(() => {
            console.log(`-> Sent!`);
          })
          .catch(console.error);
      });
    });
  },
};
