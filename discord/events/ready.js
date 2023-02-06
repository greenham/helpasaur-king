const schedule = require("node-schedule");
// @TODO: Move all of this to db.configs.discord
const ALTTP_GUILD_ID = "138378732376162304";
const REZE_ID = "86234074175258624";
const LJ_SMILE_ID = "1069331097193812071";
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
              let ljSmile = channel.guild.emojis.cache.get(LJ_SMILE_ID);
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
  },
};
