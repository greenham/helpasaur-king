const express = require("express");
const router = express.Router();
const axios = require("axios");
const jwt = require("jsonwebtoken");
const jwksClient = require("jwks-rsa");
const ms = require("ms");
const TwitchApi = require("node-twitch").default;
const Config = require("../models/config");
const TwitchUser = require("../models/twitchuser");
const {
  CLIENT_POST_AUTH_REDIRECT_URL,
  JWT_SECRET_KEY,
  TWITCH_JWT_HEADER_COOKIE_NAME,
  TWITCH_JWT_FOOTER_COOKIE_NAME,
  TWITCH_APP_OAUTH_REDIRECT_URL,
} = process.env;

const getStreamAlertsConfig = async () => {
  return await Config.findOne({ id: "streamAlerts" });
};

const validateTwitchIdToken = (idToken) => {
  return new Promise((resolve, reject) => {
    const client = jwksClient({ jwksUri: "https://id.twitch.tv/oauth2/keys" });

    function getKey(header, callback) {
      client.getSigningKey(header.kid, function (err, key) {
        var signingKey = key.publicKey || key.rsaPublicKey;
        callback(null, signingKey);
      });
    }

    jwt.verify(idToken, getKey, (err, decoded) => {
      if (err || !decoded) {
        reject("Unable to validate the ID token we received from Twitch!");
      }

      resolve(decoded);
    });
  });
};

// Endpoint: /auth
router.get(`/twitch`, async (req, res) => {
  const { config: streamAlertsConfig } = await getStreamAlertsConfig();
  const twitchApiClient = new TwitchApi({
    client_id: streamAlertsConfig.clientId,
    client_secret: streamAlertsConfig.clientSecret,
  });

  // Validate authorization code from Twitch
  const authCode = req.query.code || false;
  if (!authCode) {
    return res.redirect(CLIENT_POST_AUTH_REDIRECT_URL + "?error=missing_code");
  }

  if (!/^[a-z0-9]{30}$/.test(authCode)) {
    return res.redirect(
      CLIENT_POST_AUTH_REDIRECT_URL + "?error=bad_code_format"
    );
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

  if (response.status !== 200 || !response.data || !response.data.id_token) {
    return res.redirect(CLIENT_POST_AUTH_REDIRECT_URL + "?error=bad_response");
  }

  // Validate response from Twitch
  let twitchValidationResult;

  try {
    twitchValidationResult = await validateTwitchIdToken(
      response.data.id_token
    );
  } catch (err) {
    return res.redirect(
      CLIENT_POST_AUTH_REDIRECT_URL + "?error=could_not_validate_token"
    );
  }

  console.log("twitchValidationResult:", twitchValidationResult);

  const { sub: twitchUserId, preferred_username: twitchDisplayName } =
    twitchValidationResult;

  console.log(
    `Twitch Authorization Verified for ${twitchDisplayName} (${twitchUserId})`
  );

  // Get user data from Twitch
  let twitchUserData = null;
  try {
    getUsersResponse = await twitchApiClient.getUsers(twitchUserId);
    twitchUserData = getUsersResponse.data[0];
  } catch (err) {
    console.error(`Error fetching user data from Twitch!`, err);
  }

  let localUser;
  try {
    // Fetch local user via twitch ID
    localUser = await TwitchUser.findOne({ id: twitchUserId });

    if (localUser) {
      // Update existing user
      localUser.authCode = authCode;
      localUser.lastLogin = Date.now();
      if (twitchUserData) {
        for (key in twitchUserData) {
          localUser[key] = twitchUserData[key];
        }
      }
      localUser = await localUser.save();
    } else {
      twitchUserData.authCode = authCode;
      localUser = await TwitchUser.create(twitchUserData);
    }
  } catch (err) {
    console.error(`Error updating local user data!`, err);
  }

  // Issue our own JWT
  // This allows us to control the payload and have a longer expiration
  // All we're really using Twitch for is authentication, so it's not like we need
  // its access token to make API calls to Twitch on behalf of the user
  const idToken = jwt.sign({ isAdmin: localUser.isAdmin }, JWT_SECRET_KEY, {
    expiresIn: "7d",
    subject: localUser._id.toString(),
  });

  console.log(`Generated ID token for ${twitchDisplayName}`);
  console.log(idToken);

  // Set cookies on the client with the JWT
  // Split out the header, payload, and signature
  // We're going to store these in separate cookies for security reasons
  const idParts = idToken.split(".");

  const headerAndPayload = [idParts[0], idParts[1]].join(".");
  const signature = idParts[2];
  const maxAge = ms("7d");

  res.cookie(TWITCH_JWT_HEADER_COOKIE_NAME, headerAndPayload, {
    httpOnly: false,
    maxAge,
  });
  res.cookie(TWITCH_JWT_FOOTER_COOKIE_NAME, signature, {
    maxAge,
  });

  // Redirect to client
  res.redirect(CLIENT_POST_AUTH_REDIRECT_URL);
});

router.get(`/logout`, async (req, res) => {
  // Clear cookies
  res.cookie(TWITCH_JWT_HEADER_COOKIE_NAME, null, {
    expires: Date.now() - ms("1y"),
  });
  res.cookie(TWITCH_JWT_FOOTER_COOKIE_NAME, null, {
    expires: Date.now() - ms("1y"),
  });
  // Redirect to client
  res.redirect(CLIENT_POST_AUTH_REDIRECT_URL);
});

module.exports = router;
