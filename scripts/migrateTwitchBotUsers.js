require("dotenv").config();
const { HelpaApi } = require("helpa-api-client");
const { API_HOST, API_SECRET_KEY } = process.env;
const helpaApiClient = new HelpaApi({
  apiHost: API_HOST,
  apiKey: API_SECRET_KEY,
  serviceName: "twitch",
});

async function migrateChannels() {
  try {
    const config = await helpaApiClient.getServiceConfig();
    if (!config) {
      throw new Error(`Unable to get service config from API!`);
    }

    if (!config.channels || config.channels.length === 0) {
      console.log("🤷 No channels found! Nothing to do.");
      return;
    }

    console.log(`🚢 Migrating ${config.channels.length} channels...`);
    const startTime = Date.now();
    const promises = config.channels.map(async (channel) => {
      const response = await helpaApiClient.api.post(`/api/twitch/join`, {
        channel,
      });
      if (response.data.result === "success") {
        console.log(
          `✅ Migrated ${channel}! ${JSON.stringify(
            response.data.twitchBotConfig
          )}`
        );
      } else if (response.data.result === "error") {
        console.error(
          `🛑 Unable to migrate ${channel}: ${result.data.message}`
        );
      } else if (response.data.result === "noop") {
        console.log(`😐 ${channel} already migrated!`);
      } else {
        console.log(`❓ ${channel} returned an unknown result!`);
      }
    });
    await Promise.all(promises);

    const finalRuntime = Date.now() - startTime;
    console.log(`✨ Done! Total runtime: ${finalRuntime}ms`);
  } catch (error) {
    console.error("🛑 Error during migration:", error);
  }
}

migrateChannels();
