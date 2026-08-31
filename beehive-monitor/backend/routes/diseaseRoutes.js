const express = require("express");
const multer = require("multer");
const router = express.Router();
const { detectDisease } = require("../controllers/diseaseController");

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

router.post("/detect", upload.single("image"), detectDisease);

module.exports = router;
