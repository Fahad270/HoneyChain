const express = require("express");
const router = express.Router();
const { predictProductivity } = require("../controllers/productivityController");

router.post("/predict", predictProductivity);

module.exports = router;
