import express, { Request, Response, Router } from "express"
import axios from "axios"
import jwt from "jsonwebtoken"
import ms from "ms"
import Config from "../models/config"
import User from "../models/user"
import { requireAuthKey, getUserTwitchApiClient } from "../lib/utils"

const {
  CLIENT_POST_AUTH_REDIRECT_URL,
  JWT_SECRET_KEY,
  JWT_HEADER_COOKIE_NAME,
  JWT_FOOTER_COOKIE_NAME,
  API_HOST,
  ALLOWED_SERVICES,
} = process.env

const loginExpirationLength = "7d"
const router: Router = express.Router()

// Endpoint: GET /auth/twitch
router.get(`/twitch`, async (req: Request, res: Response) => {
  const configDoc = await Config.findOne({ id: "streamAlerts" })
  const { config: streamAlertsConfig } = configDoc as any

  //const redirectPath = req.query.redirect || "/";
  const redirectUrl = CLIENT_POST_AUTH_REDIRECT_URL // + redirectPath;

  // Validate authorization code from Twitch
  const authCode = (req.query.code as string) || false
  if (!authCode) {
    return res.redirect(redirectUrl + "?error=missing_code")
  }

  if (!/^[a-z0-9]{30}$/.test(authCode)) {
    return res.redirect(redirectUrl + "?error=bad_code_format")
  }

  // Get access and ID tokens from Twitch
  const requestUrl =
    "https://id.twitch.tv/oauth2/token" +
    `?client_id=${streamAlertsConfig.clientId}` +
    `&client_secret=${streamAlertsConfig.clientSecret}` +
    `&code=${authCode}` +
    "&grant_type=authorization_code" +
    `&redirect_uri=${API_HOST + "/auth/twitch"}`

  const response = await axios.post(requestUrl)

  if (
    response.status !== 200 ||
    !response.data ||
    !response.data.access_token
  ) {
    return res.redirect(redirectUrl + "?error=bad_response")
  }

  const twitchAuthData = response.data
  const { access_token: userAccessToken } = twitchAuthData

  // convert expires_in to expires_at
  twitchAuthData.expires_at = Date.now() + twitchAuthData.expires_in * 1000
  delete twitchAuthData.expires_in

  console.log(`Received access token for user: ${userAccessToken}`)

  // Get user data from Twitch with the user's access token
  const twitchApiUser = getUserTwitchApiClient(userAccessToken, [])

  let twitchUserData: any
  try {
    const currentUserData =
      await twitchApiUser.getCurrentUserData(userAccessToken)
    twitchUserData = {
      ...currentUserData,
      auth: twitchAuthData,
    }
  } catch (err) {
    console.error(`Error fetching user data from Twitch!`, err)
  }

  let localUser: any
  try {
    // Fetch local user via twitch ID
    localUser = await User.findOne({ "twitchUserData.id": twitchUserData.id })

    if (localUser) {
      // Update existing user
      localUser.lastLogin = Date.now()
      localUser.twitchUserData = twitchUserData
      localUser.markModified("twitchUserData")
      localUser = await localUser.save()
    } else {
      // Create new user
      localUser = await User.create({ twitchUserData })
    }
  } catch (err) {
    console.error(`Error updating local user data!`, err)
  }

  // Issue a JWT with the user's permissions and ID
  const idToken = jwt.sign(
    { permissions: localUser.permissions },
    JWT_SECRET_KEY!,
    {
      expiresIn: loginExpirationLength,
      subject: localUser._id.toString(),
    }
  )

  // Set cookies on the client with the JWT
  // Split out the header, payload, and signature
  // We're going to store these in separate cookies for security reasons I guess?
  // I don't really know what the point is, but it's what the docs say to do
  const idParts = idToken.split(".")

  const headerAndPayload = [idParts[0], idParts[1]].join(".")
  const signature = idParts[2]
  const maxAge = ms(loginExpirationLength)

  res.cookie(JWT_HEADER_COOKIE_NAME!, headerAndPayload, {
    httpOnly: false,
    maxAge,
  })
  res.cookie(JWT_FOOTER_COOKIE_NAME!, signature, {
    maxAge,
  })

  // Redirect to client
  res.redirect(redirectUrl!)
})

// Endpoint: GET /auth/service
// This is for our internal services like the discord and twitch bots, runnerwatcher, etc.
// It issues the same kind of JWT as users get, but it's long-lived and identifies the service instead of a user
router.get(`/service`, requireAuthKey, async (req: Request, res: Response) => {
  // Validate service name
  const serviceName = (req.headers["x-service-name"] as string) || false
  if (!serviceName) {
    return res.status(400).send({ message: "Missing service name" })
  }
  if (!ALLOWED_SERVICES?.includes(serviceName)) {
    return res.status(400).send({ message: "Invalid service name" })
  }

  // Issue a long-running JWT with the "service" permission and the service name as the subject
  const idToken = jwt.sign({ permissions: ["service"] }, JWT_SECRET_KEY!, {
    expiresIn: "365d",
    subject: serviceName,
  })

  console.log(`Generated ID token for service: ${serviceName}`)
  console.log(idToken)

  res.status(200).send({ token: idToken })
})

// Endpoint: GET /auth/logout
router.get(`/logout`, async (req: Request, res: Response) => {
  // Clear cookies
  res.cookie(JWT_HEADER_COOKIE_NAME!, "")
  res.cookie(JWT_FOOTER_COOKIE_NAME!, "")

  const redirectPath = req.query.redirect || "/"

  // Redirect to client
  res.redirect((CLIENT_POST_AUTH_REDIRECT_URL || "/") + redirectPath)
})

export default router
