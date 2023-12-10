const express = require("express");
const router = express.Router();
const axios = require("axios");
const jwt = require("jsonwebtoken");
const ms = require("ms");
const TwitchApi = require("node-twitch").default;
const Config = require("../models/config");
const User = require("../models/user");
const {
  CLIENT_POST_AUTH_REDIRECT_URL,
  JWT_SECRET_KEY,
  JWT_HEADER_COOKIE_NAME,
  JWT_FOOTER_COOKIE_NAME,
  TWITCH_APP_OAUTH_REDIRECT_URL,
} = process.env;
const loginExpirationLength = "7d";

const getStreamAlertsConfig = async () => {
  return await Config.findOne({ id: "streamAlerts" });
};

// Endpoint: /auth
router.get(`/twitch`, async (req, res) => {
  const { config: streamAlertsConfig } = await getStreamAlertsConfig();

  //const redirectPath = req.query.redirect || "/";
  const redirectUrl = CLIENT_POST_AUTH_REDIRECT_URL; // + redirectPath;

  // Validate authorization code from Twitch
  const authCode = req.query.code || false;
  if (!authCode) {
    return res.redirect(redirectUrl + "?error=missing_code");
  }

  if (!/^[a-z0-9]{30}$/.test(authCode)) {
    return res.redirect(redirectUrl + "?error=bad_code_format");
  }

  // Get access and ID tokens from Twitch
  const requestUrl =
    "https://id.twitch.tv/oauth2/token" +
    `?client_id=${streamAlertsConfig.clientId}` +
    `&client_secret=${streamAlertsConfig.clientSecret}` +
    `&code=${authCode}` +
    "&grant_type=authorization_code" +
    `&redirect_uri=${TWITCH_APP_OAUTH_REDIRECT_URL}`;

  const response = await axios.post(requestUrl);

  if (
    response.status !== 200 ||
    !response.data ||
    !response.data.access_token
  ) {
    return res.redirect(redirectUrl + "?error=bad_response");
  }

  const twitchAuthData = response.data;
  const { access_token: userAccessToken } = twitchAuthData;

  // convert expires_in to expires_at
  twitchAuthData.expires_at = Date.now() + twitchAuthData.expires_in * 1000;
  delete twitchAuthData.expires_in;

  console.log(`Received access token for user: ${userAccessToken}`);

  // Get user data from Twitch with the user's access token
  const twitchApiUser = new TwitchApi({
    client_id: streamAlertsConfig.clientId,
    client_secret: streamAlertsConfig.clientSecret,
    access_token: userAccessToken,
    scopes: [],
  });

  let twitchUserData = null;
  try {
    twitchUserData = await twitchApiUser.getCurrentUser();
  } catch (err) {
    console.error(`Error fetching user data from Twitch!`, err);
  }
  twitchUserData.auth = twitchAuthData;

  let localUser;
  try {
    // Fetch local user via twitch ID
    localUser = await User.findOne({ "twitchUserData.id": twitchUserData.id });

    if (localUser) {
      // Update existing user
      localUser.lastLogin = Date.now();
      localUser.twitchUserData = twitchUserData;
      localUser.markModified("twitchUserData");
      localUser = await localUser.save();
    } else {
      // Create new user
      localUser = await User.create({ twitchUserData });
    }
  } catch (err) {
    console.error(`Error updating local user data!`, err);
  }

  // Issue our own JWT
  const idToken = jwt.sign({}, JWT_SECRET_KEY, {
    expiresIn: loginExpirationLength,
    subject: localUser._id.toString(),
  });

  console.log(`Generated ID token for ${twitchUserData.display_name}`);
  console.log(idToken);

  // Set cookies on the client with the JWT
  // Split out the header, payload, and signature
  // We're going to store these in separate cookies for security reasons
  const idParts = idToken.split(".");

  const headerAndPayload = [idParts[0], idParts[1]].join(".");
  const signature = idParts[2];
  const maxAge = ms(loginExpirationLength);

  res.cookie(JWT_HEADER_COOKIE_NAME, headerAndPayload, {
    httpOnly: false,
    maxAge,
  });
  res.cookie(JWT_FOOTER_COOKIE_NAME, signature, {
    maxAge,
  });

  // Redirect to client
  res.redirect(redirectUrl);
});

router.get(`/logout`, async (req, res) => {
  // Clear cookies
  res.cookie(JWT_HEADER_COOKIE_NAME, "");
  res.cookie(JWT_FOOTER_COOKIE_NAME, "");

  const redirectPath = req.query.redirect || "/";

  // Redirect to client
  res.redirect(CLIENT_POST_AUTH_REDIRECT_URL + redirectPath);
});

module.exports = router;
