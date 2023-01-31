const schedule = require("node-schedule");

module.exports = {
  name: "ready",
  once: true,
  execute(client) {
    console.log(`Ready! Logged in as ${client.user.tag}`);

    // alttp #bot-alerts = 333676639550570496
    // CoU #general = 1013180793234927688
    const weeklyRaceAlertChannel =
      client.channels.cache.get("333676639550570496");
    let timeToSchedule = {
      dayOfWeek: 0,
      hour: 11,
      minute: 0,
      tz: "America/Los_Angeles",
    };

    // alttp nmg-race = 222135243866374144
    // CoU nmg-race = 1069299066921562275
    const weeklyRaceAlertRole = "222135243866374144";
    const rezeId = "86234074175258624";
    const ljSmile = weeklyRaceAlertChannel.guild.emojis.cache.find(
      (emoji) => emoji.name === "ljSmile"
    );
    const job = schedule.scheduleJob(timeToSchedule, () => {
      console.log(
        `Sending weekly alert to ${weeklyRaceAlertChannel.guild.name} (#${weeklyRaceAlertChannel.name})`
      );
      // let randomEmoji = guild.emojis.random();
      // @TODO: Move this message to config
      weeklyRaceAlertChannel
        .send(
          `<@&${weeklyRaceAlertRole}> The weekly Any% NMG Race is starting in 1 Hour on <https://racetime.gg> | Create an account (or log in) here: <https://racetime.gg/account/auth> | ALttP races can be found here: <https://racetime.gg/alttp>`
        )
        .then(() => {
          console.log(`Weekly alert sent!`);
          weeklyRaceAlertChannel.send(`<@${rezeId}> happy weekly ${ljSmile}`);
        })
        .catch(console.error);
    });
    console.log(
      `Weekly alert is scheduled, next invocation: ${job.nextInvocation()}`
    );
  },
};
