const schedule = require("node-schedule");
const ALTTP_GUILD_ID = "138378732376162304";
const REZE_ID = "86234074175258624";
const LJ_SMILE = "<:ljSmile:1069331097193812071>";

module.exports = {
  name: "ready",
  once: true,
  execute(client) {
    console.log(`Ready! Logged in as ${client.user.tag}`);

    let timeToSchedule = {
      dayOfWeek: 0,
      hour: 11,
      minute: 0,
      tz: "America/Los_Angeles",
    };

    // !!!!!!!!!!!!!!!!! DEBUG ONLY !!!!!!!!!!!!!!!!!!!!!
    // timeToSchedule.dayOfWeek = 2;
    // timeToSchedule.hour = 18;
    // timeToSchedule.minute = 00;
    /////////////////////////////////////////////////////

    const job = schedule.scheduleJob(timeToSchedule, () => {
      console.log(`Sending weekly alerts!`);

      // Look up which guilds/channels/roles should be alerted
      let alerts = client.config.guilds
        .filter((g) => g.enableWeeklyRaceAlert)
        .map((g) => {
          return {
            channelId: g.weeklyRaceAlertChannelId,
            roleId: g.weeklyRaceAlertRoleId,
          };
        });

      alerts.forEach((a) => {
        let channel = client.channels.cache.get(a.channelId);
        console.log(
          `Sending alert to to ${channel.guild.name} (#${channel.name})`
        );
        // @TODO: Move this message to config
        channel
          .send(
            `<@&${a.roleId}> The weekly Any% NMG Race is starting in 1 Hour on <https://racetime.gg> | Create an account (or log in) here: <https://racetime.gg/account/auth> | ALttP races can be found here: <https://racetime.gg/alttp>`
          )
          .then(() => {
            console.log(`-> Sent!`);

            // special message for reze in the alttp discord :)
            if (channel.guild.id == ALTTP_GUILD_ID) {
              channel.send(`<@${REZE_ID}> happy weekly ${LJ_SMILE}`);
            }
          })
          .catch(console.error);
      });
    });
    console.log(
      `Weekly alert is scheduled, next invocation: ${job.nextInvocation()}`
    );
  },
};
