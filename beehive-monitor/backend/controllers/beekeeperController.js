const store = require("../store/appStore");
const { pinJson } = require("../services/pinata");
const { validateAadhaar } = require("../utils/aadhaar");
const { mintGenesisForBeekeeper } = require("./blockchainController");

async function registerBeekeeper(req, res) {
  try {
    // Offline Aadhaar shape check (Verhoeff typo guard). Soft by default so
    // existing/demo flows keep working; set STRICT_AADHAAR=true to reject.
    const aadhaarCheck = validateAadhaar(req.body?.aadhaarNo || "");
    if (!aadhaarCheck.valid && (process.env.STRICT_AADHAAR || "").trim().toLowerCase() === "true") {
      return res.status(400).json({ success: false, error: aadhaarCheck.reason });
    }
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
      if (pin?.cid) {
        const updated = await store.updateBeekeeper(beekeeper._id, { pinataCid: pin.cid });
        if (updated) beekeeper.pinataCid = pin.cid;
        else beekeeper.pinataCid = pin.cid;
      }
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
