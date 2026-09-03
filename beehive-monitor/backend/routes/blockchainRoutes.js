const express = require("express");
const router = express.Router();
const { createBlock, getChain, verifyBlock, getBlock, getRoleMap, getTwin, getMine, issueSale, dualVerify, getRegistryInfo } = require("../controllers/blockchainController");
const { authenticate } = require("../middleware/auth");

// who gets what — from workflow image
router.get("/roles", (req, res) => {
  res.json({ success: true, data: getRoleMap() });
});

// personal ledger for the logged-in account (beekeeper journey / officer lots)
router.get("/mine", authenticate, getMine);

// farmer digital twin — where is my honey?
router.get("/twin/:id", getTwin);
router.get("/twin", getTwin);

// Writes need a login: tier comes from the JWT, never from self-declared headers.
router.post("/block", authenticate, createBlock);
router.post("/pool", authenticate, (req, res, next) => {
  req.body.stage = "pooled";
  return createBlock(req, res, next);
});

// Bill private-key issuance is a KVIC/retail act (tier checked in controller).
router.post("/sale", authenticate, issueSale);
// Consumer anti-fraud check must work for shoppers WITHOUT accounts.
router.post("/verify-dual", dualVerify);
router.get("/registry", getRegistryInfo);

router.get("/chain", getChain);
router.get("/verify/:hash", verifyBlock);
router.get("/block/:hash", getBlock);

module.exports = router;
