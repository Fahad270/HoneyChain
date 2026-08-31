const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const mongoose = require("mongoose");

const FILE = path.join(__dirname, "../data/runtime-store.json");

function empty() {
  return { beekeepers: [], blocks: [], jars: [], rti: [] };
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
  if (dbReady()) {
    const JarRecord = require("../models/JarRecord");
    const doc = await JarRecord.findOneAndUpdate(
      { jarSerial: payload.jarSerial },
      payload,
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

module.exports = {
  dbReady,
  createBeekeeper,
  listBeekeepers,
  findBeekeeperById,
  createBlock,
  findBlockByHash,
  findBlocks,
  countBlocks,
  findJarBySerial,
  findJarByHash,
  upsertJar,
  createRti,
  listRti,
};
