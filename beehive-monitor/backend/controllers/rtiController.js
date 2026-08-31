const store = require("../store/appStore");
const { getTwin, summarizeTrail } = require("./blockchainController");

async function createRti(req, res) {
  try {
    const { beekeeperId, hash, subject, question } = req.body || {};
    const qid = (beekeeperId || hash || "").trim();
    if (!qid) return res.status(400).json({ success: false, error: "beekeeperId or genesis hash required" });
    if (!question) return res.status(400).json({ success: false, error: "question required" });

    req.params = { ...(req.params || {}), id: qid };
    const fakeRes = {
      statusCode: 200,
      payload: null,
      status(c) {
        this.statusCode = c;
        return this;
      },
      json(p) {
        this.payload = p;
        return this;
      },
    };
    await getTwin(req, fakeRes);
    if (!fakeRes.payload?.success) {
      return res.status(fakeRes.statusCode || 404).json(fakeRes.payload || { success: false, error: "could not load honey trail" });
    }

    const twin = fakeRes.payload.data;
    const trail = twin.trail || summarizeTrail(twin.journey || [], twin.beekeeper);
    const row = await store.createRti({
      beekeeperId: String(twin.beekeeper?._id || qid),
      beekeeperName: twin.beekeeper?.name || "",
      subject: subject || "Where did my honey go?",
      question,
      trail,
    });

    res.status(201).json({
      success: true,
      data: {
        request: row,
        answer: trail,
        summary: buildPlainAnswer(trail, twin),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

function buildPlainAnswer(trail, twin) {
  const name = trail.beekeeper?.name || "Beekeeper";
  const col = trail.collections?.[0];
  const lab = trail.labs?.[0];
  const pack = trail.packaging?.[0];
  const storeHop = trail.stores?.[trail.stores.length - 1];
  const bits = [`${name}'s honey is on ${twin?.journey?.length || 0} ledger hop(s).`];
  if (col) bits.push(`Collected by ${col.collector || "collector"} (${col.org || "—"}) — ${col.quantity_kg || "?"} kg ${col.flower || ""} destined for ${col.destination || "lab"}.`);
  if (lab) bits.push(`Lab report by ${lab.officer || "KVIC"} — moisture ${lab.moisture || "n/a"}, purity ${lab.purity || "n/a"}.`);
  if (pack) bits.push(`Packed by ${pack.institution || "Khadi institution"} as jar ${pack.jarSerial || "—"}.`);
  if (storeHop) bits.push(`Last known store: ${storeHop.store || "Khadi outlet"} ${storeHop.city || ""}.`);
  if (!col && !lab && !pack) bits.push("No collection / lab / packaging hops yet — wait for KVIC to append Collection Phase 1.");
  return bits.join(" ");
}

async function listRti(req, res) {
  try {
    const rows = await store.listRti(req.query.beekeeperId);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = { createRti, listRti };
