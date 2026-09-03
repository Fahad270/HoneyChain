const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const mongoose = require("mongoose");

const FILE = path.join(__dirname, "../data/runtime-store.json");
const { normalizeAadhaar } = require("../utils/aadhaar");

function empty() {
  return { beekeepers: [], blocks: [], jars: [], rti: [], users: [] };
}

function readFile() {
  try {
    return { ...empty(), ...JSON.parse(fs.readFileSync(FILE, "utf8")) };
  } catch {
    return empty();
  }
}

function writeFile(data) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

function dbReady() {
  return mongoose.connection.readyState === 1;
}

function newId() {
  return crypto.randomBytes(12).toString("hex");
}

function toLean(doc) {
  if (!doc) return null;
  if (typeof doc.toObject === "function") return doc.toObject();
  return doc;
}

async function createBeekeeper(payload) {
  if (dbReady()) {
    const Beekeeper = require("../models/Beekeeper");
    const doc = await Beekeeper.create(payload);
    return toLean(doc);
  }
  const data = readFile();
  const row = { _id: newId(), ...payload, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), status: payload.status || "submitted" };
  data.beekeepers.unshift(row);
  writeFile(data);
  return row;
}

async function listBeekeepers() {
  if (dbReady()) {
    const Beekeeper = require("../models/Beekeeper");
    return (await Beekeeper.find().sort({ createdAt: -1 }).lean()).map(toLean);
  }
  return readFile().beekeepers.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

async function findBeekeeperById(id) {
  if (!id) return null;
  if (dbReady()) {
    const Beekeeper = require("../models/Beekeeper");
    try {
      return toLean(await Beekeeper.findById(id).lean());
    } catch {
      return null;
    }
  }
  return readFile().beekeepers.find((b) => String(b._id) === String(id)) || null;
}

// Aadhaar-linked account resolution — EVERY beekeeper record sharing these
// 12 digits. Matches the backfilled aadhaarDigits first, then normalizes the
// raw aadhaarNo on the fly for legacy rows.
async function findBeekeepersByAadhaar(digits) {
  const d = normalizeAadhaar(digits);
  if (!d) return [];
  if (dbReady()) {
    const Beekeeper = require("../models/Beekeeper");
    const direct = await Beekeeper.find({ aadhaarDigits: d }).lean();
    if (direct.length) return direct.map(toLean);
    const all = await Beekeeper.find().select("+aadhaarNo").lean();
    return all.filter((b) => normalizeAadhaar(b.aadhaarNo) === d).map(toLean);
  }
  return readFile().beekeepers.filter(
    (b) => String(b.aadhaarDigits || "") === d || normalizeAadhaar(b.aadhaarNo) === d
  );
}

async function createBlock(payload) {
  if (dbReady()) {
    const LedgerBlock = require("../models/LedgerBlock");
    const doc = await LedgerBlock.create(payload);
    return toLean(doc);
  }
  const data = readFile();
  if (data.blocks.some((b) => b.hash === payload.hash)) {
    const err = new Error("duplicate hash");
    err.code = 11000;
    err.keyValue = { hash: payload.hash };
    throw err;
  }
  const row = { _id: newId(), ...payload, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  data.blocks.push(row);
  writeFile(data);
  return row;
}

async function findBlockByHash(hash) {
  if (!hash) return null;
  if (dbReady()) {
    const LedgerBlock = require("../models/LedgerBlock");
    return toLean(await LedgerBlock.findOne({ hash }).populate("beekeeper").lean());
  }
  const data = readFile();
  const block = data.blocks.find((b) => b.hash === hash);
  if (!block) return null;
  const bk = block.beekeeper ? data.beekeepers.find((x) => String(x._id) === String(block.beekeeper)) : null;
  return { ...block, beekeeper: bk || block.beekeeper || null };
}

async function findBlocks(filter = {}) {
  if (dbReady()) {
    const LedgerBlock = require("../models/LedgerBlock");
    const q = LedgerBlock.find(filter).sort({ createdAt: 1 }).populate("beekeeper", "name village district state");
    return (await q.lean()).map(toLean);
  }
  let rows = readFile().blocks;
  if (filter.hash && filter.hash.$in) {
    const set = new Set(filter.hash.$in);
    rows = rows.filter((b) => set.has(b.hash));
  }
  return rows.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
}

async function countBlocks() {
  if (dbReady()) {
    const LedgerBlock = require("../models/LedgerBlock");
    return LedgerBlock.countDocuments();
  }
  return readFile().blocks.length;
}

async function findJarBySerial(serial) {
  if (dbReady()) {
    const JarRecord = require("../models/JarRecord");
    return toLean(await JarRecord.findOne({ jarSerial: serial }).lean());
  }
  return readFile().jars.find((j) => j.jarSerial === serial) || null;
}

async function findJarByHash(hash) {
  if (dbReady()) {
    const JarRecord = require("../models/JarRecord");
    return toLean(await JarRecord.findOne({ hash }).lean());
  }
  return readFile().jars.find((j) => j.hash === hash) || null;
}

async function upsertJar(payload) {
  if (!payload || !payload.jarSerial) {
    const err = new Error("jarSerial required");
    err.code = 400;
    throw err;
  }
  if (dbReady()) {
    const JarRecord = require("../models/JarRecord");
    const { _id, __v, createdAt, ...safe } = payload;
    const doc = await JarRecord.findOneAndUpdate(
      { jarSerial: payload.jarSerial },
      { $set: safe },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return toLean(doc);
  }
  const data = readFile();
  const idx = data.jars.findIndex((j) => j.jarSerial === payload.jarSerial || j.hash === payload.hash);
  const row = { _id: idx >= 0 ? data.jars[idx]._id : newId(), ...((idx >= 0 && data.jars[idx]) || {}), ...payload, updatedAt: new Date().toISOString() };
  if (!row.createdAt) row.createdAt = new Date().toISOString();
  if (idx >= 0) data.jars[idx] = row;
  else data.jars.push(row);
  writeFile(data);
  return row;
}

async function createRti(payload) {
  if (dbReady()) {
    const RtiRequest = require("../models/RtiRequest");
    return toLean(await RtiRequest.create(payload));
  }
  const data = readFile();
  const row = { _id: newId(), ...payload, createdAt: new Date().toISOString() };
  data.rti.unshift(row);
  writeFile(data);
  return row;
}

async function listRti(beekeeperId) {
  if (dbReady()) {
    const RtiRequest = require("../models/RtiRequest");
    const q = beekeeperId ? { beekeeperId } : {};
    return (await RtiRequest.find(q).sort({ createdAt: -1 }).lean()).map(toLean);
  }
  let rows = readFile().rti;
  if (beekeeperId) rows = rows.filter((r) => String(r.beekeeperId) === String(beekeeperId));
  return rows;
}

async function updateBeekeeper(id, patch) {
  const safe = { ...patch };
  delete safe._id;
  delete safe.__v;
  delete safe.createdAt;
  if (dbReady()) {
    const Beekeeper = require("../models/Beekeeper");
    try {
      return toLean(await Beekeeper.findByIdAndUpdate(id, { $set: safe }, { new: true }).lean());
    } catch {
      return null;
    }
  }
  const data = readFile();
  const idx = data.beekeepers.findIndex((b) => String(b._id) === String(id));
  if (idx < 0) return null;
  data.beekeepers[idx] = { ...data.beekeepers[idx], ...safe, updatedAt: new Date().toISOString() };
  writeFile(data);
  return data.beekeepers[idx];
}

// ---- Two-tier accounts ----
function stripHash(u) {
  if (!u) return u;
  const { passwordHash, __v, ...safe } = u;
  return safe;
}

async function createUser(payload) {
  if (dbReady()) {
    const User = require("../models/User");
    return stripHash(toLean(await User.create(payload)));
  }
  const data = readFile();
  const dup = data.users.find(
    (u) =>
      (payload.phone && u.phone && String(u.phone) === String(payload.phone)) ||
      (payload.email && u.email && String(u.email).toLowerCase() === String(payload.email).toLowerCase())
  );
  if (dup) {
    const err = new Error("An account with this phone/email already exists.");
    err.code = 11000;
    throw err;
  }
  const row = { _id: newId(), ...payload, status: "active", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  data.users.unshift(row);
  writeFile(data);
  return stripHash(row);
}

async function findUserById(id, { withHash = false } = {}) {
  if (!id) return null;
  let u = null;
  if (dbReady()) {
    const User = require("../models/User");
    try {
      u = toLean(await User.findById(id).lean());
    } catch {
      return null;
    }
  } else {
    u = readFile().users.find((x) => String(x._id) === String(id)) || null;
  }
  return withHash ? u : stripHash(u);
}

async function findUserByLogin(login) {
  const v = String(login || "").trim();
  if (!v) return null;
  const isEmail = v.includes("@");
  const norm = isEmail ? v.toLowerCase() : v.replace(/\D/g, "").replace(/^91(\d{10})$/, "$1").replace(/^0(\d{10})$/, "$1");
  if (dbReady()) {
    const User = require("../models/User");
    const q = isEmail ? { email: norm } : { phone: norm };
    return toLean(await User.findOne(q).lean());
  }
  const users = readFile().users;
  return (
    users.find((u) =>
      isEmail
        ? String(u.email || "").toLowerCase() === norm
        : String(u.phone || "").replace(/\D/g, "") === norm || String(u.phone || "") === norm
    ) || null
  );
}

async function listUsersByCentre(centreId) {
  if (!centreId) return [];
  if (dbReady()) {
    const User = require("../models/User");
    return (await User.find({ assignedCentreId: String(centreId), status: "active" }).sort({ createdAt: -1 }).lean()).map(stripHash);
  }
  return readFile().users
    .filter((u) => String(u.assignedCentreId || "") === String(centreId) && u.status !== "suspended")
    .map(stripHash);
}

async function updateUser(id, patch) {
  const safe = { ...patch };
  delete safe._id;
  delete safe.__v;
  delete safe.createdAt;
  delete safe.passwordHash; // password changes go through changePassword
  delete safe.role; // roles never change silently
  if (dbReady()) {
    const User = require("../models/User");
    try {
      return stripHash(toLean(await User.findByIdAndUpdate(id, { $set: safe }, { new: true }).lean()));
    } catch {
      return null;
    }
  }
  const data = readFile();
  const idx = data.users.findIndex((u) => String(u._id) === String(id));
  if (idx < 0) return null;
  data.users[idx] = { ...data.users[idx], ...safe, updatedAt: new Date().toISOString() };
  writeFile(data);
  return stripHash(data.users[idx]);
}

async function touchLogin(id) {
  const at = new Date().toISOString();
  if (dbReady()) {
    const User = require("../models/User");
    try {
      await User.findByIdAndUpdate(id, { $set: { lastLoginAt: at } });
    } catch {}
    return;
  }
  const data = readFile();
  const u = data.users.find((x) => String(x._id) === String(id));
  if (u) {
    u.lastLoginAt = at;
    writeFile(data);
  }
}

module.exports = {
  dbReady,
  createBeekeeper,
  updateBeekeeper,
  listBeekeepers,
  findBeekeeperById,
  findBeekeepersByAadhaar,
  createBlock,
  findBlockByHash,
  findBlocks,
  countBlocks,
  findJarBySerial,
  findJarByHash,
  upsertJar,
  createRti,
  listRti,
  createUser,
  findUserById,
  findUserByLogin,
  listUsersByCentre,
  updateUser,
  touchLogin,
};
