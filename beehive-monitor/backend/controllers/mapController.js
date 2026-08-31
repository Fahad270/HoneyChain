const { KVIC_CENTRES, CLUSTERS } = require("../data/indiaClusters");
const store = require("../store/appStore");

function jitter(n) {
  return (Math.random() - 0.5) * n;
}

async function getGeo(req, res) {
  try {
    const registered = await store.listBeekeepers();
    const extraFarmers = registered
      .filter((b) => Number.isFinite(b.lat) && Number.isFinite(b.lng))
      .map((b) => ({
        id: String(b._id),
        name: b.name,
        village: b.village || b.district,
        state: b.state,
        colonies: b.noOfBeeColonies,
        lat: b.lat,
        lng: b.lng,
        clusterId: b.clusterId,
        phone: b.phoneNumber,
        live: true,
      }));

    const clusters = CLUSTERS.map((c) => {
      const added = extraFarmers.filter((f) => f.clusterId === c.id);
      return {
        ...c,
        farmers: [...c.farmers, ...added],
      };
    });

    const unclustered = extraFarmers.filter((f) => !f.clusterId || !CLUSTERS.some((c) => c.id === f.clusterId));

    res.json({
      success: true,
      data: {
        centres: KVIC_CENTRES,
        clusters,
        unclustered,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function addFarmerToCluster(req, res) {
  try {
    const { clusterId, name, village, state, phoneNumber, aadhaarNo, noOfBeeColonies, lat, lng } = req.body || {};
    if (!name || !phoneNumber || !aadhaarNo) {
      return res.status(400).json({ success: false, error: "name, phoneNumber and aadhaarNo are required" });
    }
    const cluster = CLUSTERS.find((c) => c.id === clusterId);
    const kvic = cluster ? KVIC_CENTRES.find((k) => k.id === cluster.kvicId) : null;
    const farmerLat = Number.isFinite(Number(lat)) ? Number(lat) : cluster ? cluster.lat + jitter(0.35) : 22.5 + jitter(8);
    const farmerLng = Number.isFinite(Number(lng)) ? Number(lng) : cluster ? cluster.lng + jitter(0.35) : 79 + jitter(10);

    const beekeeperController = require("./beekeeperController");
    req.body = {
      name,
      village: village || cluster?.farmers?.[0]?.village || "",
      state: state || cluster?.state || kvic?.state || "",
      district: village || "",
      phoneNumber,
      aadhaarNo,
      noOfBeeColonies: Number(noOfBeeColonies) || 0,
      lat: farmerLat,
      lng: farmerLng,
      clusterId: clusterId || null,
      postalAddress: village || "",
      category: "individual",
    };
    return beekeeperController.registerBeekeeper(req, res);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = { getGeo, addFarmerToCluster };
