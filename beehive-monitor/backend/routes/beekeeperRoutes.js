const express = require("express");
const router = express.Router();
const { registerBeekeeper, listBeekeepers } = require("../controllers/beekeeperController");

router.post("/register", registerBeekeeper);
router.get("/", listBeekeepers);

module.exports = router;
