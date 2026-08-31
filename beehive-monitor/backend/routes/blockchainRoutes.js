const express = require("express");
const router = express.Router();
const { createBlock, getChain, verifyBlock, getBlock } = require("../controllers/blockchainController");

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
