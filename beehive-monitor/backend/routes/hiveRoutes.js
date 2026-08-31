const express = require("express");
const router = express.Router();
const { getHives, getWeather } = require("../controllers/hiveController");

router.get("/", getHives);
router.get("/weather", getWeather);

module.exports = router;
