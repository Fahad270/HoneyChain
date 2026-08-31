const LedgerBlock = require("../models/LedgerBlock");
const Beekeeper = require("../models/Beekeeper");
const { sha256, blockHash, pooledHash, randomSecret } = require("../utils/hash");
const { getRole, canCreateStage, STAGE_ROLES, ROLE_LABEL } = require("../middleware/auth");

// Stage display meta for UI — matches diagram 1→9
const STAGE_META = {
  beekeeper_registration: { label: "Beekeeper Registration", step: 1, desc: "Bee colony management — colony enrolled, beekeeper QR minted", icon: "🐝" },
  honey_extraction:       { label: "Honey Extraction", step: 2, desc: "Harvested from frames, filtered for wax & impurities", icon: "🍯" },
  collection:             { label: "Collection", step: 3, desc: "Raw honey procured by Cooperative / NGO / Trader", icon: "🤝" },
  pooled:                 { label: "Collective Pool", step: 3, desc: "Many farmer blocks converge — DAG: pooled lot from N prev hashes", icon: "🔗" },
  transport:              { label: "Transport", step: 4, desc: "Procured honey trucked to Processing Plant — cold chain care", icon: "🚚" },
  processing:             { label: "Processing & QC", step: 5, desc: "Filtered, clarified, pasteurized — QA tests moisture/purity/FSSAI", icon: "🧪" },
  lab_certified:          { label: "Lab Certified", step: 5, desc: "NABL lab scans & adds CA number + cert hash", icon: "🔬" },
  packaging:              { label: "Packaging & Labeling", step: 6, desc: "Food-grade pack + brand, FSSAI licence, nutrition, batch no.", icon: "🏷️" },
  distribution:           { label: "Distribution", step: 7, desc: "To KVIC outlets, institutions, e-commerce", icon: "📦" },
  retail:                 { label: "Retail — Khadi India", step: 8, desc: "Frozen at retailer — sale outlet, chain locked", icon: "🏪" },
};

function stageMeta(stage) {
  return STAGE_META[stage] || { label: stage, step: 0, desc: "", icon: "⬡" };
}

// walk chain backwards from target hash using indexed lookups only (no full collection scan)
// detects broken link / cycle / freeze violation, bounded by maxDepth to avoid runaway
async function verifyChain(targetHash, maxDepth = 500) {
  const start = await LedgerBlock.findOne({ hash: targetHash }).lean();
  if (!start) {
    const any = await LedgerBlock.countDocuments();
    if (!any) return { found: false, valid: false, reason: "ledger empty", chain: [] };
    return { found: false, valid: false, reason: "hash not found", chain: [] };
  }

  const chain = [];
  let h = targetHash;
  const visited = new Set();
  let valid = true;
  let reason = null;
  let frozenBlock = null;
  let depth = 0;

  while (h && depth < maxDepth) {
    depth++;
    if (visited.has(h)) { valid = false; reason = "cycle detected"; break; }
    visited.add(h);
    const block = await LedgerBlock.findOne({ hash: h }).lean();
    if (!block) {
      valid = false;
      reason = `missing block ${h.slice(0, 10)}…`;
      chain.push({ hash: h, missing: true, stage: "missing" });
      break;
    }
    chain.push(block);
    if (block.is_frozen) frozenBlock = block.hash;

    const parents = block.prev_hashes && block.prev_hashes.length ? block.prev_hashes : block.prev_hash ? [block.prev_hash] : [];
    if (parents.length === 0) break; // genesis
    if (parents.length === 1) {
      const p = parents[0];
      const parentBlock = await LedgerBlock.findOne({ hash: p }).lean();
      if (!parentBlock) { valid = false; reason = `missing parent ${p.slice(0, 10)}…`; chain.push({ hash: p, missing: true, stage: "missing" }); break; }
      if (parentBlock.is_frozen) { valid = false; reason = `child of frozen block ${p.slice(0, 10)}… — chain should be frozen at retail`; }
      h = p;
    } else {
      const found = await LedgerBlock.find({ hash: { $in: parents } }).lean();
      const foundSet = new Set(found.map((b) => b.hash));
      for (const p of parents) {
        if (!foundSet.has(p)) { valid = false; reason = `pooled missing parent ${p.slice(0, 10)}…`; }
      }
      const first = parents[0];
      if (!foundSet.has(first)) {
        chain.push({ hash: first, missing: true, stage: "missing" });
        break;
      }
      h = first;
    }
  }
  if (depth >= maxDepth) { valid = false; reason = `max depth ${maxDepth} exceeded — possible cycle`; }
  return { found: true, valid, reason, frozenBlock, chain: chain.reverse() };
}

function redactSecret(block) {
  if (!block || block.missing) return block;
  const { scan_secret, ...rest } = block;
  return rest;
}

// POST /api/ledger/block — linear block (most stages)
async function createBlock(req, res) {
  try {
    const { stage, prev_hash: prevHashInput, prev_hashes: prevHashesInput, data, beekeeperId, collective_name, lab, qa } = req.body;

    if (!stage || !LedgerBlock.STAGES.includes(stage)) {
      return res.status(400).json({ success: false, error: `stage must be one of: ${LedgerBlock.STAGES.join(", ")}` });
    }

    // 2-tier auth — who gets what comes from the workflow image
    const role = getRole(req);
    req.userRole = role;
    if (!canCreateStage(role, stage)) {
      return res.status(403).json({
        success: false,
        error: `Role '${role}' cannot create stage '${stage}'`,
        allowed_roles: STAGE_ROLES[stage],
        role_label: ROLE_LABEL[role],
        hint:
          role === "beekeeper"
            ? "Beekeepers: Steps 1–2 only (registration + extraction). For 3 Collection / Pooled, 4 Transport, 5 Processing, Lab, 6 Packaging, 7 Distribution, 8 Retail — switch to KVIC in header (x-role: kvic)."
            : "KVIC: Steps 3–8 only. Switch to Beekeeper to log a harvest extraction.",
        stage_roles: STAGE_ROLES,
      });
    }

    // pooled stage must use prev_hashes, others use prev_hash (linear)
    const isPooled = stage === "pooled";
    let hash, prev_hash = null, prev_hashes = undefined;

    if (isPooled) {
      const raw = Array.isArray(prevHashesInput) ? prevHashesInput.filter(Boolean).map((h) => String(h).trim()).filter(Boolean) : [];
      const hashes = [...new Set(raw)].sort();
      if (hashes.length < 2) return res.status(400).json({ success: false, error: "pooled needs at least 2 prev_hashes to converge (after trim/dedup)" });
      // all parents must exist and not be missing
      const found = await LedgerBlock.find({ hash: { $in: hashes } }).lean();
      if (found.length !== hashes.length) return res.status(400).json({ success: false, error: "one or more prev_hashes not found" });
      // no parent may be frozen child? Actually pooled can read from frozen? No — forbid pooling from frozen retail
      const frozenParent = found.find((b) => b.is_frozen);
      if (frozenParent) return res.status(400).json({ success: false, error: `cannot pool from frozen block ${frozenParent.hash.slice(0, 10)}…` });
      prev_hashes = hashes; // stored normalized (trimmed, deduped, sorted)
      hash = pooledHash(hashes, stage, data || {});
    } else {
      // linear — normalize single prev_hash
      const normalizedPrev = prevHashInput ? String(prevHashInput).trim() : null;
      if (normalizedPrev) {
        const parent = await LedgerBlock.findOne({ hash: normalizedPrev }).lean();
        if (!parent) return res.status(400).json({ success: false, error: "prev_hash not found" });
        if (parent.is_frozen) return res.status(400).json({ success: false, error: "cannot append to a frozen block (retail) — chain is locked" });
        prev_hash = normalizedPrev;
      } else {
        // only beekeeper_registration may be genesis (no prev)
        if (stage !== "beekeeper_registration") {
          return res.status(400).json({ success: false, error: "prev_hash required — only beekeeper_registration can be genesis (no prev_hash)" });
        }
        prev_hash = null;
      }
      hash = blockHash(prev_hash, stage, data || {});
    }

    // optional beekeeper ref validation
    let beekeeperRef = null;
    if (beekeeperId) {
      const bk = await Beekeeper.findById(beekeeperId).lean();
      if (bk) beekeeperRef = bk._id;
    }

    const scan_secret = randomSecret(8);
    const is_frozen = stage === "retail"; // freeze at retailer per spec

    const block = await LedgerBlock.create({
      hash,
      prev_hash,
      prev_hashes,
      stage,
      data: data || {},
      beekeeper: beekeeperRef,
      collective_name: collective_name || null,
      scan_secret,
      is_frozen,
      lab: lab || undefined,
      qa: qa || undefined,
    });

    const verify_url = `/verify/${hash}?s=${scan_secret}`;
    res.status(201).json({ success: true, data: block, meta: { verify_url, stage: stageMeta(stage) } });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ success: false, error: "duplicate hash — same prev+stage+data already exists", detail: err.keyValue });
    res.status(500).json({ success: false, error: err.message });
  }
}

// GET /api/ledger/chain — full chain ordered
async function getChain(req, res) {
  try {
    const role = getRole(req);
    const blocks = await LedgerBlock.find({}).sort({ createdAt: 1 }).populate("beekeeper", "name village").lean();
    // enrich with meta + role hint
    const enriched = blocks.map((b) => ({ ...b, stage_meta: stageMeta(b.stage) }));
    res.json({ success: true, data: enriched, meta: { role, role_label: ROLE_LABEL[role], stage_roles: STAGE_ROLES } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// GET /api/ledger/verify/:hash?s=token — verify from hash, optional scan_secret check
async function verifyBlock(req, res) {
  try {
    const { hash } = req.params;
    const token = req.query.s || null;
    const block = await LedgerBlock.findOne({ hash }).populate("beekeeper").lean();
    if (!block) return res.status(404).json({ success: false, error: "hash not found" });

    const chainRes = await verifyChain(hash);

    // scan_secret guard: if block has secret, require matching token
    let tokenValid = true;
    if (block.scan_secret) {
      tokenValid = token === block.scan_secret;
    }

    // also walk parents DAG for pooled display
    let pooledParents = [];
    if (block.prev_hashes && block.prev_hashes.length) {
      pooledParents = await LedgerBlock.find({ hash: { $in: block.prev_hashes } }).lean();
    }

    const blockWithMeta = { ...block, stage_meta: stageMeta(block.stage) };
    const blockForClient = tokenValid ? blockWithMeta : redactSecret(blockWithMeta);
    const pooledForClient = pooledParents.map((p) => redactSecret({ ...p, stage_meta: stageMeta(p.stage) }));
    const chainForClient = chainRes.chain.map((c) => (c.missing ? c : redactSecret({ ...c, stage_meta: stageMeta(c.stage) })));

    res.json({
      success: true,
      data: {
        block: blockForClient,
        tokenValid,
        pooledParents: pooledForClient,
        chain: chainForClient,
        valid: chainRes.valid,
        reason: chainRes.reason,
        frozenBlock: chainRes.frozenBlock,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// GET /api/ledger/block/:hash — single block
async function getBlock(req, res) {
  try {
    const block = await LedgerBlock.findOne({ hash: req.params.hash }).populate("beekeeper").lean();
    if (!block) return res.status(404).json({ success: false, error: "not found" });
    res.json({ success: true, data: { ...block, stage_meta: stageMeta(block.stage) } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// helper after beekeeper registration: auto-mint genesis block — called from beekeeperController
async function mintGenesisForBeekeeper(beekeeperDoc) {
  const stage = "beekeeper_registration";
  const rawAadhaar = String(beekeeperDoc.aadhaarNo || "");
  const aadhaarLast4 = rawAadhaar.slice(-4);
  const aadhaarMasked = rawAadhaar.length >= 4 ? `XXXX-XXXX-${aadhaarLast4}` : "XXXX";
  const aadhaarHash = rawAadhaar ? sha256(rawAadhaar) : null;
  const data = {
    beekeeperId: String(beekeeperDoc._id),
    name: beekeeperDoc.name,
    village: beekeeperDoc.village,
    aadhaarHash,
    aadhaarLast4,
    aadhaarMasked,
    category: beekeeperDoc.category,
    registeredAt: new Date().toISOString(),
  };
  // genesis if no prev — but if ledger already has blocks, link to latest? We keep genesis detached per beekeeper for simplicity
  // For true chain continuity, use latest hash as prev if you want single chain — here we mint as isolated genesis (prev null)
  const hash = blockHash(null, stage, data);
  const existing = await LedgerBlock.findOne({ hash }).lean();
  if (existing) return existing;
  const scan_secret = randomSecret(8);
  const block = await LedgerBlock.create({
    hash,
    prev_hash: null,
    stage,
    data,
    beekeeper: beekeeperDoc._id,
    collective_name: null,
    scan_secret,
    is_frozen: false,
  });
  return block;
}

// Digital twin: farmer tracks where his honey is in the chain
// Given a beekeeperId (ObjectId) or a specific block hash, BFS forward via children map
// to find every descendant (including pooled shared lots). Returns journey sorted.
async function getTwin(req, res) {
  try {
    const rawId = (req.params.id || req.query.id || req.query.hash || "").trim();
    if (!rawId) return res.status(400).json({ success: false, error: "provide beekeeper id or hash in :id or ?hash=" });

    const all = await LedgerBlock.find({}).sort({ createdAt: 1 }).lean();
    if (!all.length) return res.status(404).json({ success: false, error: "ledger empty" });

    const byHash = new Map(all.map((b) => [b.hash, b]));
    // children map: parent hash -> [child block]
    const childrenMap = new Map();
    for (const b of all) {
      const parents = b.prev_hashes && b.prev_hashes.length ? b.prev_hashes : b.prev_hash ? [b.prev_hash] : [];
      for (const p of parents) {
        if (!childrenMap.has(p)) childrenMap.set(p, []);
        childrenMap.get(p).push(b);
      }
    }

    let startHashes = [];
    let beekeeperDoc = null;

    // try as beekeeper ObjectId
    const isObjectId = /^[a-f0-9]{24}$/i.test(rawId);
    const isHash = /^[a-f0-9]{64}$/i.test(rawId);

    if (isObjectId) {
      beekeeperDoc = await Beekeeper.findById(rawId).lean();
      // collect every block belonging to this beekeeper (beekeeper ref or data.beekeeperId)
      startHashes = all
        .filter((b) => String(b.beekeeper || "") === rawId || String(b.data?.beekeeperId || "") === rawId)
        .map((b) => b.hash);
      if (!startHashes.length && beekeeperDoc) {
        // beekeeper exists but no blocks yet - return genesis hint
        return res.json({
          success: true,
          data: {
            beekeeper: beekeeperDoc,
            startHashes: [],
            journey: [],
            current: null,
            progress: buildProgress([]),
            message: "No honey blocks yet for this beekeeper. Register extraction at Ledger as Beekeeper.",
          },
        });
      }
    }

    // if not found as beekeeper, try as hash (or also if isHash)
    if (!startHashes.length) {
      if (byHash.has(rawId)) {
        startHashes = [rawId];
        const block = byHash.get(rawId);
        if (block.beekeeper) beekeeperDoc = await Beekeeper.findById(block.beekeeper).lean();
        else if (block.data?.beekeeperId && /^[a-f0-9]{24}$/i.test(block.data.beekeeperId)) {
          beekeeperDoc = await Beekeeper.findById(block.data.beekeeperId).lean();
        }
      }
    }

    if (!startHashes.length) {
      return res.status(404).json({ success: false, error: "no blocks found for id/hash: " + rawId });
    }

    // BFS forward from startHashes
    const visited = new Set(startHashes);
    const queue = [...startHashes];
    while (queue.length) {
      const h = queue.shift();
      const kids = childrenMap.get(h) || [];
      for (const kid of kids) {
        if (!visited.has(kid.hash)) {
          visited.add(kid.hash);
          queue.push(kid.hash);
        }
      }
    }

    const journey = all.filter((b) => visited.has(b.hash)).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const enriched = journey.map((b) => ({ ...b, stage_meta: stageMeta(b.stage) }));
    const current = enriched.length ? enriched[enriched.length - 1] : null;
    const progress = buildProgress(enriched);

    // aggregate honey stats from data
    const totalWeight = enriched.reduce((sum, b) => sum + (Number(b.data?.weight_kg) || Number(b.data?.weight) || 0), 0);
    const hives = [...new Set(enriched.map((b) => b.data?.hive_id).filter(Boolean))];

    res.json({
      success: true,
      data: {
        beekeeper: beekeeperDoc,
        query: rawId,
        startHashes,
        journey: enriched,
        current,
        progress,
        stats: { totalBlocks: enriched.length, totalWeight, hives, isFrozen: !!current?.is_frozen },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

function buildProgress(journey) {
  const order = ["beekeeper_registration", "honey_extraction", "collection", "pooled", "transport", "processing", "lab_certified", "packaging", "distribution", "retail"];
  const has = new Set(journey.map((b) => b.stage));
  const currentStage = journey.length ? journey[journey.length - 1].stage : null;
  const steps = order.map((stage) => {
    const meta = stageMeta(stage);
    let state = "pending";
    if (has.has(stage)) state = "completed";
    if (stage === currentStage) state = "current";
    // pooled and collection share step 3
    if ((stage === "collection" || stage === "pooled") && (has.has("collection") || has.has("pooled")) && stage !== currentStage) {
      // both count as same step, mark whichever exists as completed if not current
      if (has.has(stage)) state = has.has(stage) && stage === currentStage ? "current" : "completed";
    }
    return { stage, ...meta, state, has: has.has(stage) };
  });
  const completed = steps.filter((s) => s.state === "completed" || s.state === "current").length;
  const percent = Math.round((completed / steps.length) * 100);
  return { steps, currentStage, percent, completed, total: steps.length };
}

// who gets what — from workflow image supporting institutions
function getRoleMap() {
  return {
    beekeeper: {
      label: ROLE_LABEL.beekeeper,
      steps: "1 Beekeeper Management + 2 Honey Extraction",
      stages: Object.keys(STAGE_ROLES).filter((s) => STAGE_ROLES[s].includes("beekeeper")),
      institutions: "The farmer and family at the apiary",
    },
    kvic: {
      label: ROLE_LABEL.kvic,
      steps: "3 Collection + 3′ Pooled + 4 Transport + 5 Processing&QC + 5b Lab + 6 Packaging + 7 Distribution + 8 Retail freeze",
      stages: Object.keys(STAGE_ROLES).filter((s) => STAGE_ROLES[s].includes("kvic")),
      institutions: "KVIC (Nodal) + Cooperatives/NGOs + Quality Control Labs + Branding & Marketing + Retail outlets (Khadi India)",
    },
    consumer: {
      label: "Consumer — Verify only (Step 9)",
      steps: "9 Consumer — no writes, only verify at Khadi store",
      stages: [],
      institutions: "Public verify via QR, no auth",
    },
  };
}

module.exports = { createBlock, getChain, verifyBlock, getBlock, mintGenesisForBeekeeper, stageMeta, STAGE_META, verifyChain, getRoleMap, STAGE_ROLES, ROLE_LABEL, getTwin, buildProgress };
