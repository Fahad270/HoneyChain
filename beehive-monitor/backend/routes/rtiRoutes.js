const express = require("express");
const router = express.Router();
const { createRti, listRti } = require("../controllers/rtiController");

router.post("/", createRti);
router.get("/", listRti);

module.exports = router;
