import { Request, Response, NextFunction } from "express"
import { expressjwt as jwt } from "express-jwt"
import User from "../models/user"

const {
  API_KEY,
  JWT_SECRET_KEY,
  JWT_HEADER_COOKIE_NAME,
  JWT_FOOTER_COOKIE_NAME,
} = process.env

interface AuthenticatedRequest extends Request {
  user?: any
}

export const requireAuthKey = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.get("Authorization") || req.get("Authorization") !== API_KEY)
    return res.sendStatus(401)
  next()
}

export const requireJwtToken = jwt({
  secret: JWT_SECRET_KEY!,
  algorithms: ["HS256"],
  getToken: (req: any) => {
    // check Authorization header for Bearer token first
    const authorizationHeader = req.get("Authorization")
    if (authorizationHeader && authorizationHeader.split(" ")[0] === "Bearer") {
      return authorizationHeader.split(" ")[1]
    } else {
      // try to re-form id token from cookies
      const header = req.cookies[JWT_HEADER_COOKIE_NAME!]
      const footer = req.cookies[JWT_FOOTER_COOKIE_NAME!]
      return [header, footer].join(".")
    }
  },
  requestProperty: "user",
})

export const getRequestedChannel = async (
  req: AuthenticatedRequest
): Promise<string | false> => {
  // if it's a service, then the channel is provided in the body of the request
  // if it's a user, then the channel is the user's twitch login
  // -- unless it's an admin, in which case they can specify a channel in the body -- if none is specified, then use the admin's twitch channel
  let requestedChannel: string
  if (req.user.permissions.includes("service")) {
    if (!req.body.channel) {
      return false
    }
    requestedChannel = req.body.channel
  } else {
    if (req.user.permissions.includes("admin") && req.body.channel) {
      requestedChannel = req.body.channel
    } else {
      const user = await User.findById(req.user.sub)
      if (!user) return false
      requestedChannel = user.twitchUserData.login
    }
  }

  return requestedChannel
}
