const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { sha256 } = require("../utils/hash");

const KEY_FILE = path.join(__dirname, "../data/registry-key.txt");

function bytes32Hex(hex) {
  const h = String(hex || "").replace(/^0x/i, "").toLowerCase();
  return h.padStart(64, "0").slice(0, 64);
}

function loadOrCreateRegistryKey() {
  const fromEnv = (process.env.CHAIN_REGISTRY_KEY || "").trim();
  if (fromEnv) return bytes32Hex(fromEnv);
  try {
    if (fs.existsSync(KEY_FILE)) {
      const existing = fs.readFileSync(KEY_FILE, "utf8").trim();
      if (existing) return bytes32Hex(existing);
    }
  } catch {}
  const generated = sha256(`honeychain|${crypto.randomBytes(32).toString("hex")}|${Date.now()}`);
  try {
    fs.mkdirSync(path.dirname(KEY_FILE), { recursive: true });
    fs.writeFileSync(KEY_FILE, generated, "utf8");
  } catch {}
  console.warn("[chain] CHAIN_REGISTRY_KEY not set — generated local registry key (paste Remix registryKey() into .env when you deploy).");
  return generated;
}

let cachedKey = null;
function getRegistryKey() {
  if (!cachedKey) cachedKey = loadOrCreateRegistryKey();
  return cachedKey;
}

function commitPrivateKey(privateKey, publicKey) {
  return sha256(`${String(privateKey).trim().toLowerCase()}|${publicKey}|${getRegistryKey()}`);
}

function issuePrivateKey(publicKey, jarSerial, billNo) {
  const raw = crypto.randomBytes(8).toString("hex");
  const privateKey = `HC-${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}`.toUpperCase();
  const commit = commitPrivateKey(privateKey, publicKey);
  return {
    privateKey,
    privateKeyCommit: commit,
    publicKey,
    jarSerial,
    billNo,
    registryKey: getRegistryKey(),
  };
}

function jarSerial() {
  const n = crypto.randomBytes(5).toString("hex").toUpperCase();
  return `JAR-${n.slice(0, 4)}-${n.slice(4)}`;
}

module.exports = {
  getRegistryKey,
  commitPrivateKey,
  issuePrivateKey,
  jarSerial,
  bytes32Hex,
};
