const express = require("express");
const router = express.Router();
const { getVideos } = require("../controllers/videoController");

router.get("/", getVideos);

module.exports = router;
