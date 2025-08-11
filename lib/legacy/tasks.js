const moment = require("moment-timezone"),
  SG = require("./speedgaming.js"),
  SRC = require("./src.js"),
  SRTV = require("./srtv.js"),
  DISCORD = require("discord.js"),
  util = require("./util.js"),
  db = require("../db")

exports.refreshSpeedgamingEvents = (event, interval) => {
  event = event || "alttp"
  interval = interval || { days: 7 }

  return new Promise((resolve, reject) => {
    console.log(
      `[${moment().format()}] Fetching upcoming events for '${event}' from SpeedGaming...`
    )

    SG.upcoming(event, interval)
      .then((events) => {
        console.log(
          `Found ${events.length} upcoming events for '${event}'... updating local cache`
        )

        const start = async () => {
          await util.asyncForEach(events, async (event) => {
            event.lastUpdated = moment().format()

            // check for existing record, update necessary fields
            db.get()
              .collection("tourney-events")
              .findOne({ id: event.id }, (err, race) => {
                if (!err) {
                  // insert new doc if none exists
                  if (race === null) {
                    db.get()
                      .collection("tourney-events")
                      .insert(event, (err, res) => {
                        if (!err) {
                          console.log(`Created new event ${event.id}`)
                        } else {
                          console.error(err)
                        }
                      })
                  } else {
                    // update specific fields in existing record (so we don't overwrite ones we've inserted after initial fetch)
                    let update = { $set: event }
                    db.get()
                      .collection("tourney-events")
                      .update({ _id: db.oid(race._id) }, update, (err, res) => {
                        if (!err) {
                          //console.log(`Updated event ${event.id}`);
                        } else {
                          console.error(err)
                        }
                      })
                  }
                } else {
                  console.error(err)
                }
              })
          })

          console.log(`Processed ${events.length} events.`)
          resolve(true)
        }

        start()
      })
      .catch(reject)
  })
}

exports.updateSRTVRace = (raceId, guid) => {
  return new Promise((resolve, reject) => {
    Promise.all([SRTV.getRace(guid), SRTV.getRaceEntries(guid)])
      .then(([race, raceEntries]) => {
        race.entries = raceEntries
        db.get()
          .collection("tourney-events")
          .update(
            { _id: db.oid(raceId) },
            { $set: { srtvRace: race } },
            (err, result) => {
              if (err) reject(err)
            }
          )
        return race
      })
      .then((race) => {
        resolve(race)

        let p = []
        if (race.announcements) {
          p.push(SRTV.getChatHistory(race.announcements))
        }

        if (race.playerChat) {
          p.push(SRTV.getChatHistory(race.playerChat))
        }

        if (race.viewerChat) {
          p.push(SRTV.getChatHistory(race.viewerChat))
        }

        Promise.all(p)
          .then((chatHistory) => {
            db.get()
              .collection("tourney-events")
              .update(
                { _id: db.oid(raceId) },
                { $set: { "srtvRace.chatHistory": chatHistory } },
                (err, result) => {
                  if (err) console.error(err)
                }
              )
          })
          .catch(console.error)
      })
      .catch(reject)
  })
}

exports.syncSRTVRaces = () => {
  return new Promise((resolve, reject) => {
    console.log(`[${moment().format()}] Syncing SRTV races...`)

    // Find races that are currently in-progress
    db.get()
      .collection("tourney-events")
      .find({
        srtvRace: { $ne: null },
        $and: [{ "srtvRace.ended": null }, { "srtvRace.canceled": null }],
      })
      .toArray((err, races) => {
        if (!err && races) {
          if (races.length > 0) {
            races.forEach((race, index) => {
              this.updateSRTVRace(race._id, race.srtvRace.guid)
                .then((updatedRace) => {
                  if (updatedRace) {
                    console.log(`Updated race ${race.srtvRace.guid}`)
                  } else {
                    console.error("SRTV race could not be updated!")
                  }
                })
                .catch((err) => {
                  console.error(err)
                })
            })
            console.log(`Processed ${races.length} races.`)
          } else {
            console.log("No races found to process.")
          }

          resolve()
        } else if (err) {
          reject(err)
        } else {
          console.log(`No races to update.`)
          resolve()
        }
      })
  })
}

exports.updatePBs = () => {
  // get a list of tourney-people (_id, srcUsername)
  db.get()
    .collection("tourney-people")
    .find({ srcUsername: { $ne: null } })
    .project({ srcUsername: 1 })
    .toArray((err, people) => {
      if (err) return console.error(err)

      people.forEach((person) => {
        // fetch their current PB from SRC
        console.log(`Searching SRC for PB for ${person.srcUsername}...`)
        SRC.findPB(person.srcUsername, "nmg", "any")
          .then((run) => {
            if (run.run && run.run.times && run.run.times.primary_t) {
              console.log(
                `Found PB of ${run.run.times.primary_t} for ${person.srcUsername}`
              )
              // update DB
              db.get()
                .collection("tourney-people")
                .update(
                  { _id: db.oid(person._id) },
                  { $set: { pb: run.run.times.primary_t } },
                  (err, res) => {
                    if (err) {
                      console.error(err)
                    } else {
                      console.log(`Updated PB for ${person.srcUsername}`)
                    }
                  }
                )
            } else {
              console.log(`No match or PB found for ${person.srcUsername}`)
            }
          })
          .catch(console.error)
      })
    })
}

exports.updateDiscordIds = () => {
  // get all tourney-people without discordId (_id, discordTag)
  db.get()
    .collection("tourney-people")
    .find({ discordId: null })
    .project({ discordTag: 1 })
    .toArray((err, people) => {
      if (err) return console.error(err)

      // @TODO: Encapsulate this elsewhere
      db.get()
        .collection("config")
        .findOne({ default: true }, { discord: 1 }, (err, config) => {
          if (err) return console.error(err)

          // connect to Discord
          let dClient = new DISCORD.Client()
          dClient
            .on("ready", () => {
              people.forEach((person) => {
                // use Discord client to search by tag for discordId
                let foundUser = dClient.users.find("tag", person.discordTag)
                if (foundUser && foundUser.id) {
                  // update user
                  db.get()
                    .collection("tourney-people")
                    .update(
                      { _id: db.oid(person._id) },
                      { $set: { discordId: foundUser.id } },
                      (err, res) => {
                        if (err) {
                          console.error(err)
                        } else {
                          console.log(
                            `Updated discordId for ${person.discordTag} to ${foundUser.id}`
                          )
                        }
                      }
                    )
                } else {
                  console.log(
                    `---> Could not find discord ID for ${person.discordTag}!`
                  )
                }
              })
            })
            .login(config.discord.token)
        })
    })
}
