const express = require("express");
const router = express.Router();
const { createBlock, getChain, verifyBlock, getBlock, getRoleMap, getTwin, issueSale, dualVerify, getRegistryInfo } = require("../controllers/blockchainController");

// who gets what — from workflow image
router.get("/roles", (req, res) => {
  res.json({ success: true, data: getRoleMap() });
});

// farmer digital twin — where is my honey?
router.get("/twin/:id", getTwin);
router.get("/twin", getTwin);

router.post("/block", createBlock);
router.post("/pool", (req, res, next) => {
  req.body.stage = "pooled";
  return createBlock(req, res, next);
});

router.post("/sale", issueSale);
router.post("/verify-dual", dualVerify);
router.get("/registry", getRegistryInfo);

router.get("/chain", getChain);
router.get("/verify/:hash", verifyBlock);
router.get("/block/:hash", getBlock);

module.exports = router;
