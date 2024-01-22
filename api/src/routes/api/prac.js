const express = require("express");
const router = express.Router();
const PracLists = require("../../models/pracLists");
const { requireJwtToken } = require("../../lib/utils");
const guard = require("express-jwt-permissions")();

// Endpoint: /prac

// ======== PROTECTED ENDPOINTS ========
// POST /:twitchUserId/lists/:listName/entries
// Adds a new entry to the practice list
router.post(
  "/:twitchUserId/lists/:listName/entries",
  requireJwtToken,
  guard.check("service"),
  async (req, res) => {
    const twitchUserId = req.params.twitchUserId ?? false;
    if (!twitchUserId) {
      res.status(400).json({ message: "Missing twitchUserId!" });
      return;
    }

    const listName = req.params.listName ?? "default";

    // @TODO sanitize and validate the entry (char limit, etc.)
    const entry = req.body.entry.trim() ?? false;
    if (!entry) {
      res.status(400).json({ message: "Missing entry!" });
      return;
    }

    try {
      // temp: twitchUserId will be the username
      // @TODO: convert to using the actual user ID
      // once we have per-channel config support in place
      const result = await PracLists.findOne({
        twitchUserId: twitchUserId,
        name: listName,
      });

      // @TODO: Convert this to an actual ID that stays consistent for the lifetime of the entry
      let newId;
      if (result) {
        // user has a list already, append to it
        result.entries.push(entry);
        result.markModified("entries");
        await result.save();
        newId = result.entries.length;
      } else {
        // user does not have a list, create one
        const newList = new PracLists({
          twitchUserId,
          name: listName,
          entries: [entry],
        });
        await newList.save();
        newId = 1;
      }

      res.status(201).json({
        message: `Added entry #${newId} to practice list for ${twitchUserId}!`,
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// Gets a random entry from the practice list
router.get(
  "/:twitchUserId/lists/:listName/entries/random",
  requireJwtToken,
  guard.check("service"),
  async (req, res) => {
    const twitchUserId = req.params.twitchUserId ?? false;
    if (!twitchUserId) {
      res.status(400).json({ message: "Missing twitchUserId!" });
      return;
    }

    const listName = req.params.listName ?? "default";

    try {
      const result = await PracLists.findOne({
        twitchUserId,
        name: listName,
      });
      if (!result || result.entries.length === 0) {
        res
          .status(404)
          .json({ message: `Practice list for ${twitchUserId} is empty!` });
        return;
      }
      const randomIndex = Math.floor(Math.random() * result.entries.length);
      const randomEntry = result.entries[randomIndex];
      res.status(200).json({
        message: `Practice this [${randomIndex + 1}]: ${randomEntry} `,
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// Deletes a specifc entry from the practice list
router.delete(
  "/:twitchUserId/lists/:listName/entries/:entryId",
  requireJwtToken,
  guard.check("service"),
  async (req, res) => {
    const twitchUserId = req.params.twitchUserId ?? false;
    if (!twitchUserId) {
      res.status(400).json({ message: "Missing twitchUserId!" });
      return;
    }

    const listName = req.params.listName ?? "default";

    try {
      const result = await PracLists.findOne({
        twitchUserId,
        name: listName,
      });
      if (!result) {
        res.status(404).json({ message: "No practice list found!" });
        return;
      }
      const entryId = req.params.entryId;
      if (entryId < 1 || entryId > result.entries.length) {
        res.status(400).json({ message: "Invalid entry ID!" });
        return;
      }
      result.entries.splice(entryId - 1, 1);
      result.markModified("entries");
      await result.save();
      res.status(200).json({ message: `Entry #${entryId} deleted!` });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// Gets the entire practice list
router.get(
  "/:twitchUserId/lists/:listName",
  requireJwtToken,
  guard.check("service"),
  async (req, res) => {
    const twitchUserId = req.params.twitchUserId ?? false;
    if (!twitchUserId) {
      res.status(400).json({ message: "Missing twitchUserId!" });
      return;
    }

    const listName = req.params.listName ?? "default";

    try {
      const result = await PracLists.findOne({
        twitchUserId,
        name: listName,
      });
      if (!result) {
        res.status(404).json({ message: "No practice list found!" });
        return;
      }
      res.status(200).json({
        message: result.entries
          .map((e, idx) => `[${idx + 1}] ${e}`)
          .join(" | "),
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// Clears the entire practice list
router.delete(
  "/:twitchUserId/lists/:listName",
  requireJwtToken,
  guard.check("service"),
  async (req, res) => {
    const twitchUserId = req.params.twitchUserId ?? false;
    if (!twitchUserId) {
      res.status(400).json({ message: "Missing twitchUserId!" });
      return;
    }

    const listName = req.params.listName ?? "default";

    try {
      const result = await PracLists.deleteOne({
        twitchUserId,
        name: listName,
      });

      if (!result) {
        res.status(404).json({ message: "No matching practice list found!" });
        return;
      }

      res.status(200).json({ message: `Practice list cleared!` });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

module.exports = router;
