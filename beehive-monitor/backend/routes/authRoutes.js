const express = require("express");
const router = express.Router();
const { register, login, me, claimBeekeeper, claimCentre, centreStaff } = require("../controllers/authController");
const { authenticate } = require("../middleware/auth");
const { rateLimit } = require("../utils/rateLimit");

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 40 });

// Public: two-tier signup + login (rate-limited against brute force).
router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);

// Public roster for a real-world centre (names + roles only, no contacts).
router.get("/centres/:id/staff", centreStaff);

// Logged-in account only.
router.get("/me", authenticate, me);
router.post("/claim-beekeeper", authenticate, claimBeekeeper);
router.post("/claim-centre", authenticate, claimCentre);

module.exports = router;
