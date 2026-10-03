const crypto = require("crypto");

function sha256(str) {
  return crypto.createHash("sha256").update(str, "utf8").digest("hex");
}

// deterministic JSON — sorted keys, no whitespace variance
function canonicalStringify(obj) {
  if (obj === null || typeof obj !== "object") return JSON.stringify(obj);
  if (Array.isArray(obj)) return `[${obj.map(canonicalStringify).join(",")}]`;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => JSON.stringify(k) + ":" + canonicalStringify(obj[k])).join(",")}}`;
}

// Linear block: hash = SHA256(prevHash|stage|canonical(data))
// Mirrors beekeeper/app.py batch_hash(prev, ...) but generalized
function blockHash(prevHash, stage, data) {
  const payload = canonicalStringify(data || {});
  const raw = `${prevHash || ""}|${stage}|${payload}`;
  return sha256(raw);
}

// Pooled / convergent block — multiple parents (collective batches 5 farmer blocks)
// Mirrors app.py pooled_hash: SHA256(sorted(prevHashes) | stage | canonical(data))
function pooledHash(prevHashes, stage, data) {
  const sorted = [...prevHashes].sort();
  const joined = sorted.join("|");
  const payload = canonicalStringify(data || {});
  const raw = `${joined}|${stage}|${payload}`;
  return sha256(raw);
}

function randomSecret(bytes = 8) {
  return crypto.randomBytes(bytes).toString("hex"); // 16 hex chars for 8 bytes
}

module.exports = { sha256, canonicalStringify, blockHash, pooledHash, randomSecret };
