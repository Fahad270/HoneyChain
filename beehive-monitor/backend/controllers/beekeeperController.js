const store = require("../store/appStore");
const { pinJson } = require("../services/pinata");
const { mintGenesisForBeekeeper } = require("./blockchainController");

async function registerBeekeeper(req, res) {
  try {
    const beekeeper = await store.createBeekeeper(req.body);
    let genesis = null;
    try {
      genesis = await mintGenesisForBeekeeper(beekeeper);
    } catch (e) {
      console.warn("[beekeeper] genesis mint failed:", e.message);
    }
    try {
      const pin = await pinJson(`beekeeper-${beekeeper._id}`, {
        type: "beekeeper_registration",
        beekeeper: {
          id: String(beekeeper._id),
          name: beekeeper.name,
          state: beekeeper.state,
          district: beekeeper.district,
          village: beekeeper.village,
          clusterId: beekeeper.clusterId,
          colonies: beekeeper.noOfBeeColonies,
        },
        genesisHash: genesis?.hash || null,
      });
      beekeeper.pinataCid = pin.cid;
    } catch (e) {
      console.warn("[beekeeper] pinata failed:", e.message);
    }
    res.status(201).json({ success: true, data: { beekeeper, genesis } });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

async function listBeekeepers(req, res) {
  try {
    const beekeepers = await store.listBeekeepers();
    res.json({ success: true, data: beekeepers });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = { registerBeekeeper, listBeekeepers };
