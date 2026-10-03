const express = require("express");
const router = express.Router();
const { getGeo, addFarmerToCluster, getKvicCentres } = require("../controllers/mapController");
const { authenticate } = require("../middleware/auth");

router.get("/geo", getGeo);
router.get("/kvic-centres", getKvicCentres);
// Onboards + registers a farmer (mints genesis) — login required.
router.post("/farmers", authenticate, addFarmerToCluster);

module.exports = router;
