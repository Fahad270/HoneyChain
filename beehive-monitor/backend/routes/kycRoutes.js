const express = require("express");
const router = express.Router();
const {
  checkAadhaar,
  requestOtp,
  verifyOtp,
  verifiedProfile,
  digilockerAuthUrl,
  digilockerCallback,
  digilockerDocs,
} = require("../controllers/kycController");
const { rateLimit } = require("../utils/rateLimit");

// Tight limits on OTP paths: they gate full-profile PII release.
const otpLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 12, keyFn: (req) => String(req.body?.aadhaarNo || req.query?.aadhaarNo || "") });

// Aadhaar-linked resolution against OUR database:
// check (masked) -> OTP -> verify (full linked profile + prefill)
router.get("/aadhaar/check", checkAadhaar);
router.post("/aadhaar/otp", otpLimiter, requestOtp);
router.post("/aadhaar/verify", otpLimiter, verifyOtp);
router.get("/aadhaar/profile", verifiedProfile);

// DigiLocker eKYC (real OAuth when DIGILOCKER_* configured, demo otherwise)
router.get("/digilocker/auth-url", digilockerAuthUrl);
router.get("/digilocker/callback", digilockerCallback);
router.get("/digilocker/docs", digilockerDocs);

module.exports = router;
