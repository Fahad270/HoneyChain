const express = require("express");
const router = express.Router();
const { registerBeekeeper, listBeekeepers } = require("../controllers/beekeeperController");
const { authenticate } = require("../middleware/auth");

// Profile registration mints a genesis block — login required (both tiers:
// farmers self-register, KVIC staff onboard farmers into clusters).
router.post("/register", authenticate, registerBeekeeper);
router.get("/", listBeekeepers);

module.exports = router;
