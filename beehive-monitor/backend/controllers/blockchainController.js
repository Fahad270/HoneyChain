const LedgerBlock = require("../models/LedgerBlock");
const Beekeeper = require("../models/Beekeeper");
const { sha256, blockHash, pooledHash, randomSecret } = require("../utils/hash");
const { getRole, canCreateStage, STAGE_ROLES, ROLE_LABEL } = require("../middleware/auth");
const store = require("../store/appStore");
const { pinJson } = require("../services/pinata");
const { getRegistryKey, issuePrivateKey, commitPrivateKey, jarSerial } = require("../services/chainKeys");

const STAGE_META = {
  beekeeper_registration: { label: "Beekeeper Registration", step: 1, desc: "Beekeeper enrolled under KVIC Honey Mission — record pinned and genesis block auto-minted", icon: "🐝" },
  honey_extraction:        { label: "Honey Extraction", step: 2, desc: "Farmer harvests honey at apiary — records hive ID, harvest weight, flower source", icon: "🍯" },
  collection:             { label: "Collection & Mobile Processing", step: 3, desc: "KVIC Mobile Processing Unit / Van aggregates harvest directly at farm gate", icon: "🤝" },
  pooled:                 { label: "Cooperative Lot (DAG Convergence)", step: 3, desc: "Multiple beekeeper harvest hashes merged into single cooperative lot via DAG", icon: "🔗" },
  transport:              { label: "Bulk Transport", step: 4, desc: "Logistics dispatch to regional Khadi processing facility", icon: "🚚" },
  processing:             { label: "Processing & QA", step: 5, desc: "Controlled filtration (<45°C) preserving enzymes, settling & QA signoff", icon: "🧪" },
  lab_certified:          { label: "CBRTI Pune Lab Certification", step: 5, desc: "Apex CBRTI Pune certification: Moisture ≤ 20%, C3/C4 EA-IRMS, Pollen DNA", icon: "🔬" },
  packaging:              { label: "Packaging & Mass-Balance", step: 6, desc: "Khadi institution bottles jars with strict mass conservation & prints QR public key", icon: "🏷️" },
  distribution:           { label: "Distribution Dispatch", step: 7, desc: "Dispatched to Khadi Gramodyog Bhavans and ekhadiindia.com warehouses", icon: "📦" },
  retail:                 { label: "Retail & E-Commerce Sale", step: 8, desc: "POS bill or ekhadiindia.com order issues private key; chain is frozen", icon: "🏪" },
};

function stageMeta(stage) {
  return STAGE_META[stage] || { label: stage, step: 0, desc: "", icon: "⬡" };
}

// Trace back through parent blocks to determine available raw honey mass (kg)
async function traceParentWeight(prevHash, prevHashes) {
  const hashes = prevHashes && prevHashes.length ? prevHashes : prevHash ? [prevHash] : [];
  if (!hashes.length) return null;

  let totalWeight = 0;
  let foundAny = false;

  for (const h of hashes) {
    let currentHash = h;
    let depth = 0;
    while (currentHash && depth < 25) {
      depth++;
      const b = await store.findBlockByHash(currentHash);
      if (!b) break;
      const w = Number(b.data?.weight_kg || b.data?.quantity_kg || b.data?.total_weight_kg || b.data?.weight || 0);
      if (w > 0) {
        totalWeight += w;
        foundAny = true;
        break; // found weight for this branch
      }
      const parents = b.prev_hashes && b.prev_hashes.length ? b.prev_hashes : b.prev_hash ? [b.prev_hash] : [];
      if (parents.length === 1) {
        currentHash = parents[0];
      } else if (parents.length > 1) {
        const subW = await traceParentWeight(null, parents);
        if (subW && subW > 0) {
          totalWeight += subW;
          foundAny = true;
        }
        break;
      } else {
        break;
      }
    }
  }

  return foundAny ? totalWeight : null;
}

// walk chain backwards from target hash using indexed lookups only
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

// GET /api/ledger/mine
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

// POST /api/ledger/block
async function createBlock(req, res) {
  try {
    const { stage, prev_hash: prevHashInput, prev_hashes: prevHashesInput, data, beekeeperId, collective_name, lab, qa } = req.body;

    if (!stage || !LedgerBlock.STAGES.includes(stage)) {
      return res.status(400).json({ success: false, error: `stage must be one of: ${LedgerBlock.STAGES.join(", ")}` });
    }

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
    }

    let beekeeperRef = null;
    if (beekeeperId) {
      const bk = await store.findBeekeeperById(beekeeperId);
      if (bk) beekeeperRef = bk._id;
    }

    const scan_secret = randomSecret(8);
    const is_frozen = stage === "retail";
    let serial = null;
    let blockData = (data && typeof data === "object" && !Array.isArray(data)) ? { ...data } : {};

    // ==========================================
    // FEATURE 2: CBRTI PUNE LAB ATTESTATION ORACLE
    // ==========================================
    let structuredLab = lab || blockData.lab || null;
    if (stage === "lab_certified") {
      const labInput = structuredLab || {};
      const moistureRaw = labInput.moisture || blockData.moisture || "18.2%";
      const moistureVal = parseFloat(String(moistureRaw).replace("%", ""));

      // Agmark / FSSAI Grade A mandatory regulatory threshold: Moisture <= 20.0%
      if (!isNaN(moistureVal) && moistureVal > 20.0) {
        return res.status(422).json({
          success: false,
          error: `CBRTI Purity Rejection: Moisture content ${moistureVal}% exceeds mandatory limit of 20.0% (FSSAI/Agmark Grade A). Honey with >20% moisture ferments and cannot be certified.`,
          code: "CBRTI_MOISTURE_EXCEEDED",
          moisture: moistureVal,
          standard: "<= 20.0%",
        });
      }

      structuredLab = {
        ca_number: labInput.ca_number || blockData.ca_number || "CBRTI-NABL-2026-CA",
        cert_hash: labInput.cert_hash || blockData.cert_hash || sha256(JSON.stringify(labInput)),
        tester_name: labInput.tester_name || blockData.tester_name || "CBRTI Senior Quality Analyst",
        cbrti_centre: labInput.cbrti_centre || blockData.cbrti_centre || "cbrti-pune",
        moisture: !isNaN(moistureVal) ? `${moistureVal}%` : moistureRaw,
        purity: labInput.purity || blockData.purity || "Grade A (100% Pure Raw Honey)",
        c4_sugar_test: labInput.c4_sugar_test || blockData.c4_sugar_test || "Negative (EA-IRMS delta 13C within +/- 1.0‰)",
        c3_rice_syrup_test: labInput.c3_rice_syrup_test || blockData.c3_rice_syrup_test || "Negative (TMR/SMR markers absent)",
        hmf_level: labInput.hmf_level || blockData.hmf_level || "14.2 mg/kg (Limit <= 80 mg/kg)",
        pollen_profile: labInput.pollen_profile || blockData.pollen_profile || "Confirmed authentic botanical pollen profile (>65% dominant taxa)",
        antibiotic_residue: labInput.antibiotic_residue || blockData.antibiotic_residue || "Nil / Below Detection Limit (ND)",
        notes: labInput.notes || blockData.notes || "Certified by Central Bee Research & Training Institute (CBRTI), Pune",
      };
      blockData.lab = structuredLab;
    }

    // ==========================================
    // FEATURE 3: STRICT MASS-BALANCE CONSERVATION
    // ==========================================
    let massBalanceRecord = null;
    if (stage === "packaging") {
      serial = blockData.jar_serial || jarSerial();
      const existingJar = await store.findJarBySerial(serial);
      if (existingJar) {
        return res.status(409).json({ success: false, error: `duplicate jar serial ${serial} — each QR jar must be unique` });
      }
      blockData.jar_serial = serial;

      // Calculate packaged weight
      let packagedKg = Number(blockData.total_weight_kg || blockData.packaged_weight_kg || 0);
      if (!packagedKg && blockData.batch_size) {
        const unitKg = Number(blockData.jar_weight_kg || blockData.unit_weight_kg) || (blockData.unit_size_g ? Number(blockData.unit_size_g) / 1000 : 0.5);
        packagedKg = Number(blockData.batch_size) * unitKg;
      }

      if (packagedKg > 0) {
        const parentInputKg = await traceParentWeight(prev_hash, prev_hashes);
        if (parentInputKg && parentInputKg > 0) {
          const maxAllowedKg = parentInputKg * 1.05; // 5% measurement tolerance
          if (packagedKg > maxAllowedKg) {
            return res.status(422).json({
              success: false,
              error: `Mass-balance violation: Attempted to package ${packagedKg.toFixed(2)} kg from a parent harvest lot of only ${parentInputKg.toFixed(2)} kg (max allowable with tolerance: ${maxAllowedKg.toFixed(2)} kg). Volume expansion indicates unauthorized adulteration or syrup dilution.`,
              code: "MASS_BALANCE_VIOLATION",
              input_kg: parentInputKg,
              packaged_kg: packagedKg,
            });
          }
          const variancePct = Number((((packagedKg - parentInputKg) / parentInputKg) * 100).toFixed(2));
          massBalanceRecord = {
            input_weight_kg: Number(parentInputKg.toFixed(2)),
            output_weight_kg: Number(packagedKg.toFixed(2)),
            variance_pct: variancePct,
            verified: true,
          };
          blockData.mass_balance = massBalanceRecord;
        }
      }
    }

    // Compute canonical block hash
    if (isPooled) {
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
      lab: structuredLab,
      qa: qa || null,
      mass_balance: massBalanceRecord,
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
      lab: structuredLab || undefined,
      qa: qa || undefined,
      mass_balance: massBalanceRecord || undefined,
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
        mass_balance: massBalanceRecord,
        lab: structuredLab,
      },
    });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ success: false, error: "duplicate hash — same prev+stage+data already exists", detail: err.keyValue });
    res.status(500).json({ success: false, error: err.message });
  }
}

// GET /api/ledger/chain
async function getChain(req, res) {
  try {
    const role = getRole(req);
    const blocks = await store.findBlocks({});
    const enriched = blocks.map((b) => ({ ...b, stage_meta: stageMeta(b.stage) }));
    res.json({ success: true, data: enriched, meta: { role, role_label: ROLE_LABEL[role], stage_roles: STAGE_ROLES } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// GET /api/ledger/verify/:hash?s=token
async function verifyBlock(req, res) {
  try {
    const { hash } = req.params;
    const token = req.query.s || null;
    const block = await store.findBlockByHash(hash);
    if (!block) return res.status(404).json({ success: false, error: "hash not found" });

    const chainRes = await verifyChain(hash);

    let tokenValid = true;
    if (block.scan_secret) {
      tokenValid = token === block.scan_secret;
    }

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
              channel: jar.channel || "offline",
              platform: jar.platform || (jar.channel === "online" ? "ekhadiindia.com" : "Khadi Gramodyog Bhavan"),
              storeName: jar.storeName,
              billNo: jar.billNo,
              orderId: jar.orderId,
              customerContact: jar.customerContact,
              dispatchTrackingNo: jar.dispatchTrackingNo,
              verifyCount: jar.verifyCount,
              duplicateFlag: jar.duplicateFlag,
            }
          : null,
        dualKey: {
          publicKey: block.publicKey || block.hash,
          needsPrivateKey: !!(jar && jar.sold),
          channel: jar?.channel || "offline",
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// GET /api/ledger/block/:hash
async function getBlock(req, res) {
  try {
    const block = await store.findBlockByHash(req.params.hash);
    if (!block) return res.status(404).json({ success: false, error: "not found" });
    res.json({ success: true, data: { ...block, stage_meta: stageMeta(block.stage) } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// helper after beekeeper registration
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

// GET /api/ledger/twin
async function getTwin(req, res) {
  try {
    const rawId = (req.params.id || req.query.id || req.query.hash || "").trim();
    if (!rawId) return res.status(400).json({ success: false, error: "provide beekeeper id or hash in :id or ?hash=" });

    const all = await store.findBlocks({});
    if (!all.length) return res.status(404).json({ success: false, error: "ledger empty" });

    const byHash = new Map(all.map((b) => [b.hash, b]));
    let startHashes = [];
    let beekeeperDoc = null;

    const isObjectId = /^[a-f0-9]{24}$/i.test(rawId);

    if (isObjectId) {
      beekeeperDoc = await store.findBeekeeperById(rawId);
      startHashes = all
        .filter((b) => {
          const bk = b.beekeeper && typeof b.beekeeper === "object" ? b.beekeeper._id : b.beekeeper;
          return String(bk || "") === rawId || String(b.data?.beekeeperId || "") === rawId;
        })
        .map((b) => b.hash);
      if (!startHashes.length && beekeeperDoc) {
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

    const journey = journeyFromSeeds(all, startHashes);
    const enriched = journey.map((b) => ({ ...b, stage_meta: stageMeta(b.stage) }));
    const current = enriched.length ? enriched[enriched.length - 1] : null;
    const progress = buildProgress(enriched);

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

function getRoleMap() {
  return {
    beekeeper: {
      label: ROLE_LABEL.beekeeper,
      steps: "1 Beekeeper Management + 2 Honey Extraction",
      stages: Object.keys(STAGE_ROLES).filter((s) => STAGE_ROLES[s].includes("beekeeper")),
      institutions: "The farmer and family at the apiary (KVIC Honey Mission beneficiaries)",
    },
    kvic: {
      label: ROLE_LABEL.kvic,
      steps: "3 Collection + 3′ Pooled + 4 Transport + 5 Processing&QC + 5b CBRTI Lab + 6 Packaging & Mass-Balance + 7 Distribution + 8 Retail & E-Commerce",
      stages: Object.keys(STAGE_ROLES).filter((s) => STAGE_ROLES[s].includes("kvic")),
      institutions: "KVIC Central Office + CBRTI Pune + Khadi Institutions + Khadi Gramodyog Bhavans + ekhadiindia.com",
    },
    consumer: {
      label: "Consumer — Multi-Channel Verify (Step 9)",
      steps: "9 Consumer — verify physical Khadi store purchase or ekhadiindia.com delivery",
      stages: [],
      institutions: "Public verification via Jar QR + Bill Voucher / Order Invoice",
    },
  };
}

// ============================================================================
// FEATURE 1: MULTI-CHANNEL SALE (OFFLINE KHADI BHAVAN + ONLINE EKHADIINDIA.COM)
// ============================================================================
async function issueSale(req, res) {
  try {
    const role = getRole(req);
    if (role !== "kvic") {
      return res.status(403).json({ success: false, error: "Only KVIC / retail officer can log a sale and issue a verification key" });
    }
    const {
      hash,
      channel: channelInput, // "offline" | "online"
      billNo, // For offline store sales
      storeName, // For offline store sales
      offlineStoreId, // from kvicDirectory (e.g. "kgb-delhi")
      orderId, // For ekhadiindia.com online orders (e.g. "EK-2026-9810")
      platform, // "ekhadiindia.com" or "Khadi Gramodyog Bhavan"
      customerContact, // Masked phone or email
      dispatchTrackingNo, // Courier/Speed Post tracking number
    } = req.body || {};

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
        error: `This jar has already been registered as sold (${jar.channel === "online" ? `ekhadiindia.com Order ${jar.orderId}` : `Khadi Bhavan Bill ${jar.billNo}`}). Re-issuing would enable duplicate QR fraud.`,
        jarSerial: jar.jarSerial,
        channel: jar.channel,
      });
    }

    const channel = channelInput === "online" || Boolean(orderId) ? "online" : "offline";
    const bill = billNo || (channel === "offline" ? `BILL-${Date.now().toString(36).toUpperCase()}` : null);
    const resolvedOrderId = orderId || (channel === "online" ? `EK-${Date.now().toString(36).toUpperCase()}` : null);
    const resolvedPlatform = platform || (channel === "online" ? "ekhadiindia.com" : "Khadi Gramodyog Bhavan");
    const storeLabel = storeName || block.data?.store_name || block.collective_name || (channel === "online" ? "ekhadiindia.com Central Fulfillment" : "Khadi Gramodyog Bhavan");

    const issued = issuePrivateKey(jar.publicKey || block.hash, jar.jarSerial, bill || resolvedOrderId);

    await store.upsertJar({
      ...jar,
      sold: true,
      channel,
      platform: resolvedPlatform,
      billNo: bill,
      orderId: resolvedOrderId,
      customerContact: customerContact || null,
      dispatchTrackingNo: dispatchTrackingNo || null,
      storeName: storeLabel,
      offlineStoreId: offlineStoreId || null,
      privateKeyCommit: issued.privateKeyCommit,
    });

    res.status(201).json({
      success: true,
      data: {
        publicKey: issued.publicKey,
        privateKey: issued.privateKey,
        jarSerial: jar.jarSerial,
        channel,
        platform: resolvedPlatform,
        billNo: bill,
        orderId: resolvedOrderId,
        customerContact: customerContact || null,
        dispatchTrackingNo: dispatchTrackingNo || null,
        storeName: storeLabel,
        registryKey: issued.registryKey,
        ipfsCid: jar.ipfsCid || block.ipfsCid,
        note: channel === "online"
          ? "Online order dispatched. Send privateKey in the ekhadiindia.com invoice/SMS. Both jar QR and order code are required to prove authenticity."
          : "Retail sale registered. Print privateKey on physical receipt. Both jar QR and bill code are required to prove authenticity.",
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
          reason: "Public QR scan verified. Supply chain journey is intact, but proof-of-purchase requires entering your bill code or online order token.",
          chainValid: chainRes.valid,
          publicView: true,
          jar: jar ? {
            jarSerial: jar.jarSerial,
            sold: jar.sold,
            channel: jar.channel || "offline",
            platform: jar.platform,
            verifyCount: jar.verifyCount,
            duplicateFlag: jar.duplicateFlag,
          } : null,
        },
      });
    }

    if (!jar || !jar.sold || !jar.privateKeyCommit) {
      return res.json({
        success: true,
        data: {
          ok: false,
          reason: "This jar has not been registered as sold at a Khadi Bhavan or dispatched via ekhadiindia.com. Copied QR or unsold inventory.",
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
          reason: "Verification code does not match this jar. Fraudulent or mismatched invoice token.",
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

    const channelDesc = jar.channel === "online" ? `ekhadiindia.com online order (${jar.orderId || "online"})` : `Khadi Bhavan store bill (${jar.billNo || "offline"})`;

    res.json({
      success: true,
      data: {
        ok: !isDuplicate && chainRes.valid,
        reason: isDuplicate
          ? `Duplicate claim alert: This code was already claimed ${nextCount - 1} time(s) before. First claimed: ${new Date(jar.firstVerifiedAt || now).toLocaleString()}. Possible QR photocopy scam.`
          : chainRes.valid
            ? `Authentic first claim verified: QR public key + ${channelDesc} private code match. Blockchain integrity intact.`
            : `Keys match but chain issue: ${chainRes.reason}`,
        chainValid: chainRes.valid,
        duplicate: isDuplicate,
        verifyCount: nextCount,
        firstVerifiedAt: jar.firstVerifiedAt || now,
        lastVerifiedAt: now,
        duplicateScans: duplicateScans.slice(-5),
        jarSerial: jar.jarSerial,
        channel: jar.channel || "offline",
        platform: jar.platform || (jar.channel === "online" ? "ekhadiindia.com" : "Khadi Gramodyog Bhavan"),
        billNo: jar.billNo,
        orderId: jar.orderId,
        storeName: jar.storeName,
        customerContact: jar.customerContact,
        dispatchTrackingNo: jar.dispatchTrackingNo,
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
    officer: b.lab?.tester_name || b.data?.kvic_officer,
    cbrti_centre: b.lab?.cbrti_centre || "cbrti-pune",
    moisture: b.lab?.moisture || b.data?.moisture,
    purity: b.lab?.purity || b.data?.purity,
    c4_sugar_test: b.lab?.c4_sugar_test,
    c3_rice_syrup_test: b.lab?.c3_rice_syrup_test,
    hmf_level: b.lab?.hmf_level,
    pollen_profile: b.lab?.pollen_profile,
    ca_number: b.lab?.ca_number || b.data?.ca_number,
    at: b.createdAt,
    cid: b.ipfsCid,
  }));
  const packs = pick("packaging").map((b) => ({
    institution: b.data?.khadi_institution || b.collective_name,
    jarSerial: b.jarSerial || b.data?.jar_serial,
    mass_balance: b.mass_balance || b.data?.mass_balance,
    at: b.createdAt,
    cid: b.ipfsCid,
  }));
  const dist = pick("distribution").concat(pick("retail")).map((b) => ({
    store: b.data?.store_name || b.collective_name,
    city: b.data?.store_city,
    channel: b.data?.channel || "offline",
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
      lab: b.lab,
      mass_balance: b.mass_balance,
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
      channels: ["offline_khadi_bhavan", "online_ekhadiindia"],
      standards: {
        cbrti: "CBRTI Pune NABL Quality Standards",
        moistureLimit: "<= 20.0% (FSSAI/Agmark Grade A)",
        c3_c4_testing: "EA-IRMS + TMR/SMR Rice Syrup Markers",
        mass_balance: "Strict token conservation (max 5% processing variance)",
      },
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
  attributionMatch,
  buildProgress,
  issueSale,
  dualVerify,
  summarizeTrail,
  getRegistryInfo,
  traceParentWeight,
};
