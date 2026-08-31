// Two tier auth: beekeeper vs kvic
// Determined from header x-role (beekeeper | kvic). No JWT for MVP — matches image institutions.
// From Honey Workflow supporting institutions:
// - BEEKEEPER tier: steps 1 Beekeeper Management + 2 Honey Extraction (owns hive, harvest)
// - KVIC tier: steps 3 Collection (Cooperative/NGO/Trader) + 4 Transport + 5 Processing & QC
//              + 5b Lab (Quality Control Labs) + 6 Packaging (Branding) + 7 Distribution + 8 Retail (Khadi)
//              → all Supporting Institutions & Enablers collapse into KVIC nodal role.
// Consumer step 9 is public verify, no write.

const STAGE_ROLES = {
  beekeeper_registration: ["beekeeper", "kvic"], // genesis auto-minted, but allow both if manual
  honey_extraction: ["beekeeper", "kvic"], // beekeeper owns extraction; kvic can help in field
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
  const raw =
    req.headers["x-role"] ||
    req.headers["x-auth-role"] ||
    (req.headers.authorization && req.headers.authorization.startsWith("Bearer ") ? req.headers.authorization.slice(7) : null) ||
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
          ? "Beekeepers can only add extraction. Switch to KVIC in the header to do collection, pooling, processing, lab and retail."
          : "KVIC can add steps 3–8. Switch to Beekeeper to log a harvest.",
        role,
        stage_roles: STAGE_ROLES,
      });
    }
    next();
  };
}

module.exports = { STAGE_ROLES, ROLE_LABEL, getRole, canCreateStage, requireRole };
