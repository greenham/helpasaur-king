const { expressjwt: jwt } = require("express-jwt");
const User = require("../models/user");
const {
  API_KEY,
  JWT_SECRET_KEY,
  JWT_HEADER_COOKIE_NAME,
  JWT_FOOTER_COOKIE_NAME,
} = process.env;

const requireAuthKey = (req, res, next) => {
  if (!req.get("Authorization") || req.get("Authorization") !== API_KEY)
    return res.sendStatus(401);
  next();
};

const requireJwtToken = jwt({
  secret: JWT_SECRET_KEY,
  algorithms: ["HS256"],
  getToken: (req) => {
    // check Authorization header for Bearer token first
    const authorizationHeader = req.get("Authorization");
    if (authorizationHeader && authorizationHeader.split(" ")[0] === "Bearer") {
      return authorizationHeader.split(" ")[1];
    } else {
      // try to re-form id token from cookies
      const header = req.cookies[JWT_HEADER_COOKIE_NAME];
      const footer = req.cookies[JWT_FOOTER_COOKIE_NAME];
      return [header, footer].join(".");
    }
  },
});

// @TODO: Allow passing of permissions instead of hardcoding
const userHasPermission = async (req, res, next) => {
  if (!req.auth || !req.auth.sub) return res.sendStatus(401);

  try {
    const user = await User.findById(req.auth.sub);
    if (!user || !user.permissions?.includes("admin"))
      return res.sendStatus(401);
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }

  next();
};

const getRequestedChannel = async (req) => {
  if (
    !req.auth ||
    !["service", "user"].includes(req.auth.entity) ||
    !req.auth.sub
  ) {
    return false;
  }

  // check req.auth to see who is logged in
  // if it's a service, then the channel is provided in the body of the request
  // if it's a user, then the channel is the user's twitch login
  // -- unless it's an admin, in which case they can specify a channel in the body -- if none is specified, then use the admin's twitch channel
  let requestedChannel;
  if (req.auth.entity === "service") {
    if (!req.body.channel) {
      return false;
    }
    requestedChannel = req.body.channel;
  } else if (req.auth.entity === "user") {
    // check if the logged-in user is an admin
    const user = await User.findById(req.auth.sub);
    if (user.permissions.includes("admin")) {
      if (req.body.channel) {
        requestedChannel = req.body.channel;
      } else {
        requestedChannel = user.twitchUserData.login;
      }
    } else {
      requestedChannel = user.twitchUserData.login;
    }
  }

  return requestedChannel;
};

module.exports = {
  requireAuthKey,
  requireJwtToken,
  userHasPermission,
  getRequestedChannel,
};
