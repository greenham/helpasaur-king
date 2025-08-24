import express, { Request, Response, Router } from "express"
import axios from "axios"
import jwt from "jsonwebtoken"
import ms from "ms"
import { TwitchPrivilegedUserData } from "twitch-api-client"
import User from "../models/user"
import { IUserDocument } from "../types/models"
import { requireAuthKey, getUserTwitchApiClient } from "../lib/utils"
import { sendSuccess, sendError } from "../lib/responseHelpers"
import { config } from "../config"
const {
  clientPostAuthRedirectUrl,
  jwtSecretKey,
  jwtHeaderCookieName,
  jwtFooterCookieName,
  apiHost,
  allowedServices,
  twitchAppClientId,
  twitchAppClientSecret,
} = config

const loginExpirationLength = "7d"
const router: Router = express.Router()

// Endpoint: GET /auth/twitch
router.get(`/twitch`, async (req: Request, res: Response) => {
  // Validate authorization code from Twitch
  const authCode = (req.query.code as string) || false
  if (!authCode) {
    return res.redirect(`${clientPostAuthRedirectUrl}?error=missing_code`)
  }

  if (!/^[a-z0-9]{30}$/.test(authCode)) {
    return res.redirect(`${clientPostAuthRedirectUrl}?error=bad_code_format`)
  }

  // Get access and ID tokens from Twitch
  const requestUrl =
    "https://id.twitch.tv/oauth2/token" +
    `?client_id=${twitchAppClientId}` +
    `&client_secret=${twitchAppClientSecret}` +
    `&code=${authCode}` +
    "&grant_type=authorization_code" +
    `&redirect_uri=${`${apiHost}/auth/twitch`}`

  const response = await axios.post(requestUrl)

  if (
    response.status !== 200 ||
    !response.data ||
    !response.data.access_token
  ) {
    return res.redirect(`${clientPostAuthRedirectUrl}?error=bad_response`)
  }

  const twitchAuthData = response.data
  const { access_token: userAccessToken } = twitchAuthData

  // convert expires_in to expires_at
  twitchAuthData.expires_at = Date.now() + twitchAuthData.expires_in * 1000
  delete twitchAuthData.expires_in

  console.log(`Received access token for user: ${userAccessToken}`)

  // Get user data from Twitch with the user's access token
  const twitchApiUser = getUserTwitchApiClient(userAccessToken, [])

  let twitchUserData: TwitchPrivilegedUserData & {
    auth?: typeof twitchAuthData
  }
  try {
    const currentUserData =
      await twitchApiUser.getCurrentUserData(userAccessToken)
    twitchUserData = {
      ...currentUserData,
      auth: twitchAuthData,
    }
  } catch (err) {
    console.error(`Error fetching user data from Twitch!`, err)
    return sendError(res, "Failed to fetch user data from Twitch", 500)
  }

  let localUser: IUserDocument | null = null
  try {
    // Fetch local user via twitch ID
    localUser = (await User.findOne({
      "twitchUserData.id": twitchUserData.id,
    })) as IUserDocument | null

    if (localUser) {
      // Update existing user
      localUser.lastLogin = new Date()
      // Store twitchUserData with type conversion for the database
      localUser.twitchUserData = {
        ...twitchUserData,
        created_at: new Date(twitchUserData.created_at),
        auth: twitchUserData.auth,
      }
      localUser.markModified("twitchUserData")
      localUser = await localUser.save()
    } else {
      // Create new user with type conversion for the database
      localUser = (await User.create({
        twitchUserData: {
          ...twitchUserData,
          created_at: new Date(twitchUserData.created_at),
          auth: twitchUserData.auth,
        },
      })) as IUserDocument
    }
  } catch (err) {
    console.error(`Error updating local user data!`, err)
    return sendError(res, "Failed to update user data", 500)
  }

  if (!localUser) {
    return sendError(res, "Failed to create or update user", 500)
  }

  // Issue a JWT with the user's permissions and ID
  const idToken = jwt.sign(
    { permissions: localUser.permissions || [] },
    jwtSecretKey,
    {
      expiresIn: loginExpirationLength,
      subject: String(localUser._id),
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

  res.cookie(jwtHeaderCookieName, headerAndPayload, {
    httpOnly: false,
    maxAge,
  })
  res.cookie(jwtFooterCookieName, signature, {
    maxAge,
  })

  // Redirect to client
  res.redirect(clientPostAuthRedirectUrl)
})

// Endpoint: GET /auth/service
// This is for our internal services like the discord and twitch bots, runnerwatcher, etc.
// It issues the same kind of JWT as users get, but it's long-lived and identifies the service instead of a user
router.get(`/service`, requireAuthKey, async (req: Request, res: Response) => {
  // Validate service name
  const serviceName = (req.headers["x-service-name"] as string) || false
  if (!serviceName) {
    return sendError(res, "Missing service name", 400)
  }
  if (!allowedServices.includes(serviceName)) {
    return sendError(res, "Invalid service name", 400)
  }

  // Issue a long-running JWT with the "service" permission and the service name as the subject
  const idToken = jwt.sign({ permissions: ["service"] }, jwtSecretKey, {
    expiresIn: "365d",
    subject: serviceName,
  })

  console.log(`Generated ID token for service: ${serviceName}`)

  sendSuccess(res, { token: idToken })
})

// Endpoint: GET /auth/logout
router.get(`/logout`, async (req: Request, res: Response) => {
  // Clear cookies
  res.cookie(jwtHeaderCookieName, "")
  res.cookie(jwtFooterCookieName, "")

  const redirectPath = req.query.redirect || "/"

  // Redirect to client
  res.redirect((clientPostAuthRedirectUrl || "/") + redirectPath)
})

export default router
