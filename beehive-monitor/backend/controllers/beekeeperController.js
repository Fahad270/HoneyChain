const Beekeeper = require("../models/Beekeeper");

async function registerBeekeeper(req, res) {
  try {
    const beekeeper = await Beekeeper.create(req.body);
    res.status(201).json({ success: true, data: beekeeper });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

async function listBeekeepers(req, res) {
  try {
    const beekeepers = await Beekeeper.find().sort({ createdAt: -1 });
    res.json({ success: true, data: beekeepers });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = { registerBeekeeper, listBeekeepers };
