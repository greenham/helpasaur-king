const express = require("express");
const router = express.Router();
const PracLists = require("../../models/pracLists");
const { requireJwtToken } = require("../../lib/utils");
const guard = require("express-jwt-permissions")();

// Endpoint: /prac

// ======== PROTECTED ENDPOINTS ========
// POST / -> create new entry in the default list for this user
// payload will be like:
// { twitchUserId: string, entry: string }
router.post(
  "/list/default/entry",
  requireJwtToken,
  guard.check("service"),
  async (req, res) => {
    try {
      // temp: twitchUserId will be the username
      // @TODO: convert to using the actual user ID
      // once we have per-channel config support in place
      // first check: does this user have a list already?
      // if yes, append to current list
      // if no, create a new list with first entry

      const result = await PracLists.findOne({
        twitchUserId: req.body.twitchUserId,
      });
      let newId;
      if (result) {
        // user has a list already, append to it
        result.entries.push(req.body.entry);
        result.markModified("entries");
        await result.save();
        newId = result.entries.length;
      } else {
        // user does not have a list, create one
        const newList = new PracLists({
          twitchUserId: req.body.twitchUserId,
          name: "default",
          entries: [req.body.entry],
        });
        await newList.save();
        newId = 1;
      }
      res
        .status(201)
        .json({ message: `Added entry #${newId} to practice list!` });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// the ID of the entry is the index + 1 (remember this when deleting)

module.exports = router;
