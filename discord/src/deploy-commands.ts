import { REST, Routes } from "discord.js"
import * as fs from "node:fs"
import * as path from "node:path"
import { HelpaApi, ServiceName } from "@helpasaur/api-client"
import { config } from "./config"

const { apiHost, apiKey, serviceName } = config

const helpaApiClient = new HelpaApi({
  apiHost,
  apiKey,
  serviceName: serviceName as ServiceName,
})

helpaApiClient
  .getServiceConfig()
  .then((config: any) => {
    if (!config) {
      throw new Error(`Unable to get service config from API!`)
    }

    const { clientId, token } = config

    const commands: any[] = []
    const commandsPath = path.join(__dirname, "commands")
    const commandFiles = fs
      .readdirSync(commandsPath)
      .filter((file) => file.endsWith(".js"))

    for (const file of commandFiles) {
      // Grab the SlashCommandBuilder#toJSON() output of each command's data for deployment
      const filePath = path.join(commandsPath, file)
      const command = require(filePath)
      if ("data" in command && "execute" in command) {
        commands.push(command.data.toJSON())
      } else {
        console.log(
          `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
        )
      }
    }

    // Construct and prepare an instance of the REST module
    const rest = new REST().setToken(token)

    // and deploy your commands!
    ;(async () => {
      try {
        console.log(
          `Started refreshing ${commands.length} application (/) commands.`
        )

        // The put method is used to fully refresh all commands with the current set
        const data = (await rest.put(
          // GUILD-SPECIFIC DEPLOY: Routes.applicationGuildCommands(clientId, guildId),
          Routes.applicationCommands(clientId),
          { body: commands }
        )) as any[]

        console.log(
          `Successfully reloaded ${data.length} application (/) commands.`
        )
      } catch (error) {
        console.error(error)
      }
    })()

    // or delete them as needed
    // (async () => {
    //   try {
    //     console.log(
    //       `Started deleting ${commands.length} application (/) commands.`
    //     );
    //     const data = await rest.put(Routes.applicationCommands(clientId), {
    //       body: [],
    //     });
    //     console.log("Successfully deleted all application commands.");
    //   } catch (error) {
    //     console.error(error);
    //   }
    // })();
  })
  .catch((error: any) => {
    console.error("Error fetching service config:", error)
  })

// COMMAND DELETION (All Commands)
// for guild-based commands
// rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: [] })
// 	.then(() => console.log('Successfully deleted all guild commands.'))
// 	.catch(console.error);

// // for global commands
// rest.put(Routes.applicationCommands(clientId), { body: [] })
// 	.then(() => console.log('Successfully deleted all application commands.'))
// 	.catch(console.error);

// COMMAND DELETION (Single Command)
// for guild-based commands
// rest.delete(Routes.applicationGuildCommand(clientId, guildId, 'commandId'))
// 	.then(() => console.log('Successfully deleted guild command'))
// 	.catch(console.error);

// // for global commands
// rest.delete(Routes.applicationCommand(clientId, 'commandId'))
// 	.then(() => console.log('Successfully deleted application command'))
// 	.catch(console.error);
