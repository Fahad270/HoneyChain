const { sha256, canonicalStringify } = require("../utils/hash");

function localCid(payload) {
  return "bafy" + sha256(canonicalStringify(payload)).slice(0, 52);
}

async function pinJson(name, content) {
  const jwt = (process.env.PINATA_JWT || "").trim();
  const body = { name, content, pinnedAt: new Date().toISOString() };

  if (!jwt) {
    const cid = localCid(body);
    return {
      cid,
      url: null,
      pinned: false,
      provider: "local-fallback",
      hint: "Set PINATA_JWT in backend/.env to pin to IPFS via Pinata",
    };
  }

  try {
    const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        pinataContent: content,
        pinataMetadata: { name: String(name || "honeychain-block").slice(0, 80) },
      }),
    });
    const json = await res.json();
    if (!res.ok || !json.IpfsHash) {
      const cid = localCid(body);
      return {
        cid,
        url: null,
        pinned: false,
        provider: "local-fallback",
        error: json.error || json.error?.details || json.message || `pinata ${res.status}`,
      };
    }
    const gateway = (process.env.PINATA_GATEWAY || "https://gateway.pinata.cloud").replace(/\/$/, "");
    return {
      cid: json.IpfsHash,
      url: `${gateway}/ipfs/${json.IpfsHash}`,
      pinned: true,
      provider: "pinata",
    };
  } catch (err) {
    const cid = localCid(body);
    return { cid, url: null, pinned: false, provider: "local-fallback", error: err.message };
  }
}

module.exports = { pinJson, localCid };
