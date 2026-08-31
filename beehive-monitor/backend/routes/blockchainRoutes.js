const express = require("express");
const router = express.Router();
const { createBlock, getChain, verifyBlock, getBlock, getRoleMap } = require("../controllers/blockchainController");

// who gets what — from workflow image
router.get("/roles", (req, res) => {
  res.json({ success: true, data: getRoleMap() });
});

// farmer digital twin — where is my honey?
const { getTwin } = require("../controllers/blockchainController");
router.get("/twin/:id", getTwin);
router.get("/twin", getTwin); // also supports ?hash= or ?id=

// create linear or pooled block — pooled when body.prev_hashes array present (stage must be 'pooled')
router.post("/block", createBlock);

// convenience alias: /pool — same as /block but enforces pooled semantics
router.post("/pool", (req, res, next) => {
  req.body.stage = "pooled";
  return createBlock(req, res, next);
});

router.get("/chain", getChain);
router.get("/verify/:hash", verifyBlock);
router.get("/block/:hash", getBlock);

module.exports = router;
