const express = require("express");
const router = express.Router();
const { createRti, listRti } = require("../controllers/rtiController");
const { rateLimit } = require("../utils/rateLimit");

// Filing writes to the store — throttle per IP so it can't be spammed into a DoS.
const fileLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 20 });

router.post("/", fileLimiter, createRti);
router.get("/", listRti);

module.exports = router;
