const LedgerBlock = require("../models/LedgerBlock");
const Beekeeper = require("../models/Beekeeper");
const { sha256, blockHash, pooledHash, randomSecret } = require("../utils/hash");
const { getRole, canCreateStage, STAGE_ROLES, ROLE_LABEL } = require("../middleware/auth");
const store = require("../store/appStore");
const { pinJson } = require("../services/pinata");
const { getRegistryKey, issuePrivateKey, commitPrivateKey, jarSerial } = require("../services/chainKeys");

const STAGE_META = {
  beekeeper_registration: { label: "Beekeeper Registration", step: 1, desc: "Beekeeper enrolled — record pinned (Pinata / Mongo) and appended", icon: "🐝" },
  honey_extraction:        { label: "Honey Extraction", step: 2, desc: "Farmer harvests honey — hive, weight, flower source", icon: "🍯" },
  collection:             { label: "Collection Phase 1", step: 3, desc: "Collector, quantity, flower type, destination lab / smart van", icon: "🤝" },
  pooled:                 { label: "Collective Pool", step: 3, desc: "Optional many-farmer collection lot", icon: "🔗" },
  transport:              { label: "Transport", step: 4, desc: "Truck to processing plant", icon: "🚚" },
  processing:             { label: "Processing & QC", step: 5, desc: "Filtered / clarified / pasteurized + QA tester scans prev QR", icon: "🧪" },
  lab_certified:          { label: "Lab Report", step: 5, desc: "KVIC / lab form + moisture/purity — QR appended", icon: "🔬" },
  packaging:              { label: "Packaging", step: 6, desc: "Khadi village institutions print & stick jar QR (public key)", icon: "🏷️" },
  distribution:           { label: "Distribution", step: 7, desc: "Which lot went to which Khadi / KVIC store", icon: "📦" },
  retail:                 { label: "Retail sale", step: 8, desc: "Bill issues one-time private key; chain freezes", icon: "🏪" },
};

function stageMeta(stage) {
  return STAGE_META[stage] || { label: stage, step: 0, desc: "", icon: "⬡" };
}

// walk chain backwards from target hash using indexed lookups only (no full collection scan)
// detects broken link / cycle / freeze violation, bounded by maxDepth to avoid runaway
async function verifyChain(targetHash, maxDepth = 500) {
    const start = await store.findBlockByHash(targetHash);
    if (!start) {
      const any = await store.countBlocks();
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
    const block = await store.findBlockByHash(h);
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
      const parentBlock = await store.findBlockByHash(p);
      if (!parentBlock) { valid = false; reason = `missing parent ${p.slice(0, 10)}…`; chain.push({ hash: p, missing: true, stage: "missing" }); break; }
      if (parentBlock.is_frozen) { valid = false; reason = `child of frozen block ${p.slice(0, 10)}… — chain should be frozen at retail`; }
      h = p;
    } else {
      const found = await store.findBlocks({ hash: { $in: parents } });
      const foundSet = new Set(found.map((b) => b.hash));
      for (const p of parents) {
        if (!foundSet.has(p)) { valid = false; reason = `pooled missing parent ${p.slice(0, 10)}…`; }
      }
      const frozenPooled = found.find((b) => b.is_frozen);
      if (frozenPooled) { valid = false; reason = `child of frozen block ${frozenPooled.hash.slice(0, 10)}… — chain should be frozen at retail`; }
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

// Stamp a new block with its minter (for personal ledgers). Reads the
// account behind req.authUser; never throws — worst case createdBy is null.
async function authorStamp(req) {
  try {
    const sub = req.authUser && req.authUser.sub;
    if (!sub) return null;
    const u = await store.findUserById(sub);
    if (!u) return null;
    return {
      userId: u._id,
      name: u.name || null,
      role: u.role || null,
      centreId: u.assignedCentreId || null,
      orgName: u.orgName || null,
    };
  } catch {
    return null;
  }
}

function attributionMatch(b, beekeeperId) {
  const ref = b.beekeeper && typeof b.beekeeper === "object" ? b.beekeeper._id : b.beekeeper;
  return String(ref || "") === String(beekeeperId) || String(b.data?.beekeeperId || "") === String(beekeeperId);
}

// BFS forward from seed hashes through the children map — the shared engine
// behind getTwin, the KYC linked profile and GET /mine.
function journeyFromSeeds(all, seeds) {
  const childrenMap = new Map();
  for (const b of all) {
    const parents = b.prev_hashes && b.prev_hashes.length ? b.prev_hashes : b.prev_hash ? [b.prev_hash] : [];
    for (const p of parents) {
      if (!childrenMap.has(p)) childrenMap.set(p, []);
      childrenMap.get(p).push(b);
    }
  }
  const visited = new Set(seeds);
  const queue = [...seeds];
  while (queue.length) {
    for (const kid of childrenMap.get(queue.shift()) || []) {
      if (!visited.has(kid.hash)) {
        visited.add(kid.hash);
        queue.push(kid.hash);
      }
    }
  }
  return all
    .filter((b) => visited.has(b.hash))
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

// GET /api/ledger/mine — personal ledger for the logged-in account.
// - beekeeper tier: needs a claimed beekeeper profile → its full journey
//   (attributed blocks + every downstream hop, same as the twin).
// - kvic tier: blocks this officer minted + their onward journeys
//   ("lots I touched, and where they went").
async function getMine(req, res) {
  try {
    const me = await store.findUserById(req.authUser.sub);
    if (!me) return res.status(404).json({ success: false, error: "Account not found." });
    const all = await store.findBlocks({});

    if (me.role === "beekeeper") {
      if (!me.beekeeperId) {
        return res.status(404).json({
          success: false,
          error: "No beekeeper profile linked yet — verify via Get Aadhaar Info, then link it on the Account page.",
        });
      }
      const beekeeperDoc = await store.findBeekeeperById(me.beekeeperId);
      const seeds = all.filter((b) => attributionMatch(b, me.beekeeperId)).map((b) => b.hash);
      const journey = journeyFromSeeds(all, seeds).map((b) => ({ ...b, stage_meta: stageMeta(b.stage) }));
      return res.json({
        success: true,
        data: {
          scope: {
            type: "beekeeper",
            beekeeper: beekeeperDoc ? { _id: beekeeperDoc._id, name: beekeeperDoc.name, village: beekeeperDoc.village, state: beekeeperDoc.state } : null,
          },
          blocks: journey,
          stats: {
            blocks: journey.length,
            currentStage: journey.length ? journey[journey.length - 1].stage : null,
            isFrozen: Boolean(journey.length && journey[journey.length - 1].is_frozen),
          },
        },
      });
    }

    // kvic officer
    const mine = all.filter((b) => String(b.createdBy?.userId || "") === String(me._id));
    const seeds = mine.map((b) => b.hash);
    const journey = journeyFromSeeds(all, seeds).map((b) => ({ ...b, stage_meta: stageMeta(b.stage) }));
    const centre = me.assignedCentreId
      ? require("../data/kvicDirectory").KVIC_CENTRES.find((c) => c.id === me.assignedCentreId) || null
      : null;
    return res.json({
      success: true,
      data: {
        scope: {
          type: "officer",
          officer: { name: me.name, designation: me.designation || "", orgName: me.orgName || "" },
          centre: centre ? { id: centre.id, name: centre.name, city: centre.city, state: centre.state } : null,
          minted: mine.length,
        },
        blocks: journey,
        stats: {
          blocks: journey.length,
          minted: mine.length,
          currentStage: journey.length ? journey[journey.length - 1].stage : null,
          isFrozen: Boolean(journey.length && journey[journey.length - 1].is_frozen),
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
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
            ? "Beekeepers: Steps 1–2 only (registration + extraction). For 3 Collection / Pooled, 4 Transport, 5 Processing, Lab, 6 Packaging, 7 Distribution, 8 Retail — log in with a KVIC account."
            : "KVIC: Steps 3–8 only. Log in with a beekeeper account to log a harvest extraction.",
        stage_roles: STAGE_ROLES,
      });
    }

    // pooled / collection-many: prev_hashes; others: prev_hash
    const isPooled = stage === "pooled" || (Array.isArray(prevHashesInput) && prevHashesInput.filter(Boolean).length >= 2);
    let hash, prev_hash = null, prev_hashes = undefined;

    if (isPooled) {
      const raw = Array.isArray(prevHashesInput) ? prevHashesInput.filter(Boolean).map((h) => String(h).trim()).filter(Boolean) : [];
      const hashes = [...new Set(raw)].sort();
      if (hashes.length < 2) return res.status(400).json({ success: false, error: "pooled / multi-farmer collection needs at least 2 prev_hashes" });
      const found = await store.findBlocks({ hash: { $in: hashes } });
      if (found.length !== hashes.length) return res.status(400).json({ success: false, error: "one or more prev_hashes not found" });
      const frozenParent = found.find((b) => b.is_frozen);
      if (frozenParent) return res.status(400).json({ success: false, error: `cannot pool from frozen block ${frozenParent.hash.slice(0, 10)}…` });
      prev_hashes = hashes;
      hash = pooledHash(hashes, stage, data || {});
    } else {
      const normalizedPrev = prevHashInput ? String(prevHashInput).trim() : null;
      if (normalizedPrev) {
        const parent = await store.findBlockByHash(normalizedPrev);
        if (!parent) return res.status(400).json({ success: false, error: "prev_hash not found" });
        if (parent.is_frozen) return res.status(400).json({ success: false, error: "cannot append to a frozen block (retail) — chain is locked" });
        prev_hash = normalizedPrev;
      } else {
        if (stage !== "beekeeper_registration") {
          return res.status(400).json({ success: false, error: "prev_hash required — only beekeeper_registration can be genesis (no prev_hash)" });
        }
        prev_hash = null;
      }
      hash = blockHash(prev_hash, stage, data || {});
    }

    let beekeeperRef = null;
    if (beekeeperId) {
      const bk = await store.findBeekeeperById(beekeeperId);
      if (bk) beekeeperRef = bk._id;
    }

    const scan_secret = randomSecret(8);
    const is_frozen = stage === "retail";
    let serial = null;
    // normalize data first so jar_serial is always committed into the hash + stored payload
    let blockData = (data && typeof data === "object" && !Array.isArray(data)) ? { ...data } : {};
    if (stage === "packaging") {
      serial = blockData.jar_serial || jarSerial();
      const existingJar = await store.findJarBySerial(serial);
      if (existingJar) {
        return res.status(409).json({ success: false, error: `duplicate jar serial ${serial} — each QR jar must be unique` });
      }
      blockData.jar_serial = serial;
      hash = isPooled ? pooledHash(prev_hashes, stage, blockData) : blockHash(prev_hash, stage, blockData);
    } else if (isPooled) {
      // hash already computed from data||{} — recompute from normalized object for determinism
      hash = pooledHash(prev_hashes, stage, blockData);
    } else {
      hash = blockHash(prev_hash, stage, blockData);
    }

    const pin = await pinJson(`ledger-${stage}-${hash.slice(0, 12)}`, {
      hash,
      prev_hash,
      prev_hashes,
      stage,
      data: blockData,
      lab: lab || null,
      qa: qa || null,
      registryKey: getRegistryKey(),
    });

    const block = await store.createBlock({
      hash,
      prev_hash,
      prev_hashes,
      stage,
      data: blockData,
      beekeeper: beekeeperRef,
      collective_name: collective_name || null,
      scan_secret,
      is_frozen,
      lab: lab || undefined,
      qa: qa || undefined,
      ipfsCid: pin.cid,
      ipfsUrl: pin.url,
      pinataPinned: pin.pinned,
      publicKey: hash,
      jarSerial: serial,
      registryKey: getRegistryKey(),
      createdBy: await authorStamp(req),
    });

    if (stage === "packaging" && serial) {
      await store.upsertJar({
        jarSerial: serial,
        hash,
        publicKey: hash,
        ipfsCid: pin.cid,
        packagingHash: hash,
      });
    }

    const verify_url = `/verify/${hash}?s=${scan_secret}`;
    res.status(201).json({
      success: true,
      data: block,
      meta: {
        verify_url,
        stage: stageMeta(stage),
        pinata: { cid: pin.cid, url: pin.url, pinned: pin.pinned, provider: pin.provider },
        publicKey: hash,
        jarSerial: serial,
        registryKey: getRegistryKey(),
      },
    });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ success: false, error: "duplicate hash — same prev+stage+data already exists", detail: err.keyValue });
    res.status(500).json({ success: false, error: err.message });
  }
}

// GET /api/ledger/chain — full chain ordered
async function getChain(req, res) {
  try {
    const role = getRole(req);
    const blocks = await store.findBlocks({});
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
    const block = await store.findBlockByHash(hash);
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
      pooledParents = await store.findBlocks({ hash: { $in: block.prev_hashes } });
    }

    const jar = await store.findJarByHash(hash);
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
        jar: jar
          ? {
              jarSerial: jar.jarSerial,
              sold: jar.sold,
              storeName: jar.storeName,
              billNo: jar.billNo,
              verifyCount: jar.verifyCount,
              duplicateFlag: jar.duplicateFlag,
            }
          : null,
        dualKey: {
          publicKey: block.publicKey || block.hash,
          needsPrivateKey: !!(jar && jar.sold),
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// GET /api/ledger/block/:hash — single block
async function getBlock(req, res) {
  try {
    const block = await store.findBlockByHash(req.params.hash);
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
  const existing = await store.findBlockByHash(hash);
  if (existing) return existing;
  const scan_secret = randomSecret(8);
  const pin = await pinJson(`genesis-${String(beekeeperDoc._id)}`, data);
  const block = await store.createBlock({
    hash,
    prev_hash: null,
    stage,
    data,
    beekeeper: beekeeperDoc._id,
    collective_name: null,
    scan_secret,
    is_frozen: false,
    ipfsCid: pin.cid,
    ipfsUrl: pin.url,
    pinataPinned: pin.pinned,
    publicKey: hash,
    registryKey: getRegistryKey(),
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

    const all = await store.findBlocks({});
    if (!all.length) return res.status(404).json({ success: false, error: "ledger empty" });

    const byHash = new Map(all.map((b) => [b.hash, b]));

    let startHashes = [];
    let beekeeperDoc = null;

    // try as beekeeper ObjectId
    const isObjectId = /^[a-f0-9]{24}$/i.test(rawId);
    const isHash = /^[a-f0-9]{64}$/i.test(rawId);

    if (isObjectId) {
      beekeeperDoc = await store.findBeekeeperById(rawId);
      // collect every block belonging to this beekeeper (beekeeper ref or data.beekeeperId)
      startHashes = all
        .filter((b) => {
          const bk = b.beekeeper && typeof b.beekeeper === "object" ? b.beekeeper._id : b.beekeeper;
          return String(bk || "") === rawId || String(b.data?.beekeeperId || "") === rawId;
        })
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
        if (block.beekeeper) beekeeperDoc = await store.findBeekeeperById(block.beekeeper);
        else if (block.data?.beekeeperId && /^[a-f0-9]{24}$/i.test(block.data.beekeeperId)) {
          beekeeperDoc = await store.findBeekeeperById(block.data.beekeeperId);
        }
      }
    }

    if (!startHashes.length) {
      return res.status(404).json({ success: false, error: "no blocks found for id/hash: " + rawId });
    }

    // BFS forward from startHashes (shared journey engine)
    const journey = journeyFromSeeds(all, startHashes);
    const enriched = journey.map((b) => ({ ...b, stage_meta: stageMeta(b.stage) }));
    const current = enriched.length ? enriched[enriched.length - 1] : null;
    const progress = buildProgress(enriched);

    // aggregate honey stats from data
    const totalWeight = enriched.reduce((sum, b) => sum + (Number(b.data?.weight_kg) || Number(b.data?.weight) || Number(b.data?.quantity_kg) || 0), 0);
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
        trail: summarizeTrail(enriched, beekeeperDoc),
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
    if ((stage === "collection" || stage === "pooled") && (has.has("collection") || has.has("pooled")) && stage !== currentStage) {
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

async function issueSale(req, res) {
  try {
    const role = getRole(req);
    if (role !== "kvic") {
      return res.status(403).json({ success: false, error: "Only KVIC / retail can issue a bill private key" });
    }
    const { hash, billNo, storeName } = req.body || {};
    if (!hash) return res.status(400).json({ success: false, error: "hash (QR public key) required" });
    const block = await store.findBlockByHash(String(hash).trim());
    if (!block) return res.status(404).json({ success: false, error: "jar / block not found" });

    let jar = await store.findJarByHash(block.hash);
    if (!jar) {
      const serial = block.jarSerial || (block.data && block.data.jar_serial) || jarSerial();
      jar = await store.upsertJar({
        jarSerial: serial,
        hash: block.hash,
        publicKey: block.publicKey || block.hash,
        ipfsCid: block.ipfsCid,
        packagingHash: block.hash,
      });
    }
    if (jar.sold) {
      return res.status(409).json({
        success: false,
        error: "This jar already has a bill code. Re-issuing would enable a duplicate QR scam.",
        jarSerial: jar.jarSerial,
      });
    }

    const bill = billNo || `BILL-${Date.now().toString(36).toUpperCase()}`;
    const storeLabel = storeName || block.data?.store_name || block.collective_name || "Khadi India";
    const issued = issuePrivateKey(jar.publicKey || block.hash, jar.jarSerial, bill);
    await store.upsertJar({
      ...jar,
      sold: true,
      billNo: bill,
      storeName: storeLabel,
      privateKeyCommit: issued.privateKeyCommit,
    });

    res.status(201).json({
      success: true,
      data: {
        publicKey: issued.publicKey,
        privateKey: issued.privateKey,
        jarSerial: jar.jarSerial,
        billNo: bill,
        storeName: storeLabel,
        registryKey: issued.registryKey,
        ipfsCid: jar.ipfsCid || block.ipfsCid,
        note: "Print privateKey on the bill only. QR on the jar is the public key. Both are required to prove this sale.",
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function dualVerify(req, res) {
  try {
    const publicKey = String(req.body?.publicKey || req.body?.hash || "").trim();
    const privateKey = String(req.body?.privateKey || "").trim();
    if (!publicKey) return res.status(400).json({ success: false, error: "publicKey / hash from QR required" });
    const block = await store.findBlockByHash(publicKey);
    if (!block) return res.status(404).json({ success: false, error: "unknown QR public key" });
    const chainRes = await verifyChain(publicKey);
    const jar = await store.findJarByHash(publicKey);

    if (!privateKey) {
      return res.json({
        success: true,
        data: {
          ok: false,
          reason: "QR only — chain can be viewed but authenticity of sale is not proven. Enter the bill private key.",
          chainValid: chainRes.valid,
          publicView: true,
          jar: jar ? { jarSerial: jar.jarSerial, sold: jar.sold, verifyCount: jar.verifyCount, duplicateFlag: jar.duplicateFlag } : null,
        },
      });
    }

    if (!jar || !jar.sold || !jar.privateKeyCommit) {
      return res.json({
        success: true,
        data: {
          ok: false,
          reason: "This jar has not been sold yet — no bill private key exists. Copied QR without a real sale.",
          chainValid: chainRes.valid,
          duplicate: false,
        },
      });
    }

    const commit = commitPrivateKey(privateKey, jar.publicKey || publicKey);
    if (commit !== jar.privateKeyCommit) {
      return res.json({
        success: true,
        data: {
          ok: false,
          reason: "Private key does not match this QR. Label swap / counterfeit bill.",
          chainValid: chainRes.valid,
          duplicate: false,
        },
      });
    }

    const nextCount = (jar.verifyCount || 0) + 1;
    const isDuplicate = nextCount > 1;
    const now = new Date().toISOString();
    const duplicateScans = jar.duplicateScans || [];
    if (isDuplicate) {
      duplicateScans.push(now);
    }
    await store.upsertJar({
      ...jar,
      verifyCount: nextCount,
      lastVerifiedAt: now,
      firstVerifiedAt: jar.firstVerifiedAt || now,
      duplicateFlag: isDuplicate,
      duplicateScans: duplicateScans.slice(-10),
    });

    res.json({
      success: true,
      data: {
        ok: !isDuplicate && chainRes.valid,
        reason: isDuplicate
          ? `Duplicate claim — this bill code was already used ${nextCount - 1} time(s) before. Possible copied QR or second sale of the same serial.`
          : chainRes.valid
            ? "Authentic first claim — QR public key + bill private key match, chain intact."
            : `Keys match but chain issue: ${chainRes.reason}`,
        chainValid: chainRes.valid,
        duplicate: isDuplicate,
        verifyCount: nextCount,
        firstVerifiedAt: jar.firstVerifiedAt || now,
        lastVerifiedAt: now,
        duplicateScans: duplicateScans.slice(-5),
        jarSerial: jar.jarSerial,
        storeName: jar.storeName,
        billNo: jar.billNo,
        ipfsCid: jar.ipfsCid || block.ipfsCid,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

function summarizeTrail(journey, beekeeper) {
  const pick = (stage) => journey.filter((b) => b.stage === stage);
  const collections = pick("collection").map((b) => ({
    collector: b.data?.collector_name || b.collective_name,
    org: b.data?.collector_org,
    quantity_kg: b.data?.quantity_kg || b.data?.weight_kg,
    flower: b.data?.flower_type || b.data?.flower_source,
    destination: b.data?.destination_lab,
    at: b.createdAt,
    cid: b.ipfsCid,
  }));
  const labs = pick("lab_certified").map((b) => ({
    officer: b.data?.kvic_officer || b.lab?.tester_name,
    moisture: b.data?.moisture || b.lab?.moisture,
    purity: b.data?.purity || b.lab?.purity,
    ca_number: b.data?.ca_number || b.lab?.ca_number,
    at: b.createdAt,
    cid: b.ipfsCid,
  }));
  const packs = pick("packaging").map((b) => ({
    institution: b.data?.khadi_institution || b.collective_name,
    jarSerial: b.jarSerial || b.data?.jar_serial,
    at: b.createdAt,
    cid: b.ipfsCid,
  }));
  const dist = pick("distribution").concat(pick("retail")).map((b) => ({
    store: b.data?.store_name || b.collective_name,
    city: b.data?.store_city,
    at: b.createdAt,
    cid: b.ipfsCid,
  }));
  return {
    beekeeper: beekeeper
      ? { name: beekeeper.name, village: beekeeper.village, district: beekeeper.district, state: beekeeper.state }
      : null,
    collections,
    labs,
    packaging: packs,
    stores: dist,
    hops: journey.map((b) => ({
      stage: b.stage,
      label: stageMeta(b.stage).label,
      hash: b.hash,
      cid: b.ipfsCid,
      at: b.createdAt,
      data: b.data,
    })),
  };
}

async function getRegistryInfo(req, res) {
  res.json({
    success: true,
    data: {
      registryKey: getRegistryKey(),
      remixContract: "contracts/HoneyChainRegistry.sol",
      pinataConfigured: !!(process.env.PINATA_JWT || "").trim(),
      db: store.dbReady() ? "mongodb" : "local-json",
    },
  });
}

module.exports = {
  createBlock,
  getChain,
  verifyBlock,
  getBlock,
  mintGenesisForBeekeeper,
  stageMeta,
  STAGE_META,
  verifyChain,
  getRoleMap,
  STAGE_ROLES,
  ROLE_LABEL,
  getTwin,
  getMine,
  journeyFromSeeds,
  buildProgress,
  issueSale,
  dualVerify,
  summarizeTrail,
  getRegistryInfo,
};
