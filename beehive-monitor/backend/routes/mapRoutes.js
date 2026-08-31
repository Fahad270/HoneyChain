const express = require("express");
const router = express.Router();
const { getGeo, addFarmerToCluster } = require("../controllers/mapController");

router.get("/geo", getGeo);
router.post("/farmers", addFarmerToCluster);

module.exports = router;
