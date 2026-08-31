const Beekeeper = require("../models/Beekeeper");
const { mintGenesisForBeekeeper } = require("./blockchainController");

async function registerBeekeeper(req, res) {
  try {
    const beekeeper = await Beekeeper.create(req.body);
    let genesis = null;
    try {
      genesis = await mintGenesisForBeekeeper(beekeeper);
    } catch (e) {
      // genesis mint is best-effort — don't fail registration if chain is unreachable
      console.warn("[beekeeper] genesis mint failed:", e.message);
    }
    res.status(201).json({ success: true, data: beekeeper, genesis });
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
