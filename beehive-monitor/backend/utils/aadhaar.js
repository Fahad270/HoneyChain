// Aadhaar number utilities — offline, no UIDAI call needed.
//
// UIDAI Aadhaar numbers are 12 digits where the last digit is a Verhoeff
// checksum (same algorithm as in the official Aadhaar documentation).
// This lets us catch typos instantly without any licensed API.
//
// NOTE on privacy: Aadhaar data is sensitive (Aadhaar Act, 2016). Never log
// full numbers, never return full numbers from list endpoints, and gate the
// full linked-profile fetch behind OTP verification (see kycController).

// Verhoeff tables (standard)
const D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];
const P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 7, 2, 5],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

// Strip everything but digits. Returns "" when nothing usable remains.
function normalizeAadhaar(input) {
  if (input === null || input === undefined) return "";
  return String(input).replace(/\D/g, "");
}

// Verhoeff checksum over a digit string. True when check digit is valid.
function verhoeffCheck(digits) {
  if (!/^\d+$/.test(digits || "")) return false;
  let c = 0;
  const rev = String(digits).split("").reverse();
  for (let i = 0; i < rev.length; i++) {
    c = D[c][P[i % 8][Number(rev[i])]];
  }
  return c === 0;
}

// Full UIDAI-shape validation: 12 digits, first digit 2–9 (UIDAI rule —
// 0/1 are never issued), not all identical, Verhoeff checksum passes.
function validateAadhaar(input) {
  const digits = normalizeAadhaar(input);
  if (!digits) return { valid: false, digits: "", reason: "Enter your 12-digit Aadhaar number." };
  if (digits.length !== 12) {
    return { valid: false, digits, reason: `Aadhaar needs 12 digits — you entered ${digits.length}.` };
  }
  if (/^(\d)\1{11}$/.test(digits)) {
    return { valid: false, digits, reason: "This number can't be a real Aadhaar (all digits identical)." };
  }
  if (digits[0] === "0" || digits[0] === "1") {
    return { valid: false, digits, reason: "Aadhaar numbers never start with 0 or 1 — check for a typo." };
  }
  if (!verhoeffCheck(digits)) {
    return { valid: false, digits, reason: "Checksum failed — likely a typo. Recheck the digits." };
  }
  return { valid: true, digits, reason: null };
}

function maskAadhaar(digits) {
  const d = normalizeAadhaar(digits);
  if (d.length !== 12) return "XXXX-XXXX-XXXX";
  return `XXXX-XXXX-${d.slice(-4)}`;
}

function last4(digits) {
  const d = normalizeAadhaar(digits);
  return d.length === 12 ? d.slice(-4) : "";
}

// Mask a name for pre-OTP display: "Ramesh More" -> "R•••• M•••"
function maskName(name) {
  if (!name) return "••••";
  return String(name)
    .trim()
    .split(/\s+/)
    .map((w) => (w ? w[0] + "•".repeat(Math.min(Math.max(w.length - 1, 3), 5)) : ""))
    .join(" ");
}

module.exports = { normalizeAadhaar, verhoeffCheck, validateAadhaar, maskAadhaar, last4, maskName };
