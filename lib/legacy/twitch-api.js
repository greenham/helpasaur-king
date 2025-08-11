const axios = require("axios")
const twitchAuthBaseUrl = "https://id.twitch.tv/oauth2/token"

class TwitchApi {
  constructor(clientId, clientSecret, autoRenew = true) {
    this.clientId = clientId
    this.clientSecret = clientSecret
    this.autoRenew = autoRenew
    this.accessToken = null
  }

  async getToken() {
    if (this.accessToken !== null && Date.now() < this.accessToken.expires_at) {
      return this.accessToken
    }

    const params = {
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: "client_credentials",
    }

    let queryString = Object.keys(params)
      .map((key) => key + "=" + params[key])
      .join("&")

    let requestUrl = twitchAuthBaseUrl + "?" + queryString

    try {
      let res = await axios.post(requestUrl)
      if (res.status == 200) {
        res.data.expires_at = Date.now() + res.data.expires_in * 1000
        this.accessToken = res.data

        console.log(
          `Got initial access token from Twitch: ${this.accessToken.access_token}`
        )

        // set up auto-renew if enabled
        if (this.autoRenew === true) {
          console.log(
            `Auto-renew enabled, renewing in ${this.accessToken.expires_in / 1000 / 60} minutes`
          )
          setTimeout(async () => {
            console.log(`Renewing twitch access token...`)
            this.accessToken = await this.getToken()
            if (this.accessToken === false) {
              console.error(`Unable to renew twitch access token!`)
            } else {
              console.log(
                `Got renewed access token from Twitch: ${this.accessToken.access_token}`
              )
            }
          }, this.accessToken.expires_in)
        }

        return this.accessToken
      } else {
        console.error(
          `Unexpected response received while fetching access token from Twitch: ${res.status} | ${res.data}`
        )
        return false
      }
    } catch (err) {
      console.error(`Error fetching access token from Twitch: ${err}`)
      return false
    }
  }

  async getApiHeaders() {
    let token = await this.getToken()

    if (token === false) return false

    return {
      Authorization: `Bearer ${token.access_token}`,
      "Client-ID": this.clientId,
    }
  }
}

module.exports = TwitchApi
