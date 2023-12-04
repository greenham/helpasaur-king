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
    const authorizationHeader = req.headers.authorization;
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

module.exports = {
  requireAuthKey,
  requireJwtToken,
  userHasPermission,
};
