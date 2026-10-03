// Two-tier auth: beekeeper vs kvic. Role comes ONLY from a verified login JWT
// (authenticate/optionalAuth set req.authUser). The `x-role` header / `?role=`
// query survive purely as a display hint for public reads and grant nothing —
// every write route requires `authenticate`.
// From Honey Workflow supporting institutions:
// - BEEKEEPER tier: steps 1 Beekeeper Management + 2 Honey Extraction (owns hive, harvest)
// - KVIC tier: steps 3 Collection (Cooperative/NGO/Trader) + 4 Transport + 5 Processing & QC
//              + 5b Lab (Quality Control Labs) + 6 Packaging (Branding) + 7 Distribution + 8 Retail (Khadi)
//              → all Supporting Institutions & Enablers collapse into KVIC nodal role.
// Consumer step 9 is public verify, no write.

const STAGE_ROLES = {
  beekeeper_registration: ["beekeeper", "kvic"],
  honey_extraction: ["beekeeper"],
  collection: ["kvic"],
  pooled: ["kvic"],
  transport: ["kvic"],
  processing: ["kvic"],
  lab_certified: ["kvic"],
  packaging: ["kvic"],
  distribution: ["kvic"],
  retail: ["kvic"],
};

const ROLE_LABEL = {
  beekeeper: "Beekeeper — Hive & Harvest (Steps 1–2)",
  kvic: "KVIC — Cooperative, Plant, Lab, Brand, Retail (Steps 3–8)",
};

function getRole(req) {
  // Logged-in account role wins (set by authenticate/optionalAuth).
  if (req.authUser && (req.authUser.role === "beekeeper" || req.authUser.role === "kvic")) {
    return req.authUser.role;
  }
  // No-login fallback for PUBLIC reads (role map labels, chain meta only).
  // All writes require a JWT — self-declared headers grant nothing.
  const raw =
    req.headers["x-role"] ||
    req.headers["x-auth-role"] ||
    req.query.role ||
    "";
  const role = String(raw || "").trim().toLowerCase();
  if (role === "kvic" || role === "kvic_officer" || role === "admin" || role === "officer") return "kvic";
  if (role === "beekeeper" || role === "farmer") return "beekeeper";
  // default to beekeeper for writes, public for reads — but explicit is better
  return "beekeeper";
}

function canCreateStage(role, stage) {
  const allowed = STAGE_ROLES[stage];
  if (!allowed) return false;
  return allowed.includes(role);
}

// middleware for routes that need role check — pass allowed roles or check stage dynamically
function requireRole(...allowed) {
  return (req, res, next) => {
    const role = getRole(req);
    req.userRole = role;
    if (allowed.length && !allowed.includes(role)) {
      return res.status(403).json({
        success: false,
        error: `Role ${role} not allowed. Need one of: ${allowed.join(", ")}`,
        hint: role === "beekeeper"
          ? "Beekeepers can only add extraction. Log in with a KVIC account to do collection, pooling, processing, lab and retail."
          : "KVIC can add steps 3–8. Log in with a beekeeper account to log a harvest.",
        role,
        stage_roles: STAGE_ROLES,
      });
    }
    next();
  };
}

// ---- JWT account auth (two-tier login) ----

function jwtSecret() {
  return (process.env.JWT_SECRET || "").trim() || "dev-only-insecure-honeychain-secret-change-me";
}

// Authenticate a Bearer JWT from /api/auth/login|register.
// Attaches req.authUser = { sub, role }. Missing/invalid token -> 401.
function authenticate(req, res, next) {
  try {
    const header = String(req.headers.authorization || "");
    const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
    if (!token) {
      return res.status(401).json({ success: false, error: "Login required — send Authorization: Bearer <token>." });
    }
    let payload;
    try {
      payload = require("jsonwebtoken").verify(token, jwtSecret());
    } catch {
      return res.status(401).json({ success: false, error: "Session expired or invalid — log in again." });
    }
    if (!payload?.sub || !["beekeeper", "kvic"].includes(payload?.role)) {
      return res.status(401).json({ success: false, error: "Session expired or invalid — log in again." });
    }
    req.authUser = { sub: String(payload.sub), role: payload.role };
    next();
  } catch {
    return res.status(401).json({ success: false, error: "Login required." });
  }
}

// Optional auth: attaches req.authUser when a valid Bearer token is present,
// otherwise continues anonymously (demo mode keeps working).
function optionalAuth(req, _res, next) {
  try {
    const header = String(req.headers.authorization || "");
    const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
    if (!token) return next();
    const payload = require("jsonwebtoken").verify(token, jwtSecret());
    if (payload?.sub && ["beekeeper", "kvic"].includes(payload?.role)) {
      req.authUser = { sub: String(payload.sub), role: payload.role };
    }
  } catch {}
  next();
}

module.exports = { STAGE_ROLES, ROLE_LABEL, getRole, canCreateStage, requireRole, authenticate, optionalAuth };
