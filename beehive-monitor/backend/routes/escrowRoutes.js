const express = require("express");
const router = express.Router();
const {
  getEscrowList,
  getEscrowByLot,
  getEscrowsByBeekeeper,
  triggerDbtDisbursement,
} = require("../controllers/escrowController");
const { authenticate } = require("../middleware/auth");

// Public/dashboard list of all escrows
router.get("/list", getEscrowList);

// Get escrow details by lot hash
router.get("/lot/:hash", getEscrowByLot);

// Get beekeeper's personal DBT payments and escrowed earnings
router.get("/beekeeper/:beekeeperId", getEscrowsByBeekeeper);

// Trigger or simulate DBT release (KVIC officer or automated oracle)
router.post("/trigger-dbt", authenticate, triggerDbtDisbursement);

module.exports = router;
