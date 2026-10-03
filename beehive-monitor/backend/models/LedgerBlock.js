const mongoose = require("mongoose");

// One block = one hop in Honey Workflow 1→9
// Linear by default (prev_hash), pooled when collective merges many farmers (prev_hashes array → pooledHash DAG)
const STAGES = [
  "beekeeper_registration", // 1 — genesis, beekeeper QR minted after Register form
  "honey_extraction",       // 2 — farmer extracts
  "collection",             // 3 — procured by cooperative/NGO/trader (single farmer pickup)
  "pooled",                 // 3-collapsed — collective batches N farmer blocks converge (DAG)
  "transport",              // 4 — truck to processing plant
  "processing",             // 5 — filtered/clarified/pasteurized + QA tester scans prev QR
  "lab_certified",          // 5b — lab adds his block by scanning (CA, cert hash) — CBRTI Pune purity attestation
  "packaging",              // 6 — food-grade pack + label (FSSAI, batch no, nutrition, mass-balance check)
  "distribution",           // 7 — marketing & distribution to outlets (Khadi Bhavans / ekhadiindia warehouses)
  "retail",                 // 8 — Khadi India / outlet / e-commerce dispatch — freeze point
];

const LedgerBlockSchema = new mongoose.Schema(
  {
    hash: { type: String, required: true, unique: true, index: true },
    prev_hash: { type: String, default: null, index: true }, // linear parent
    prev_hashes: { type: [String], default: undefined }, // only for pooled convergence — stored when set

    stage: { type: String, enum: STAGES, required: true, index: true },

    // free-form payload per stage — validated loosely, hashed canonically
    data: { type: mongoose.Schema.Types.Mixed, default: {} },

    // refs for convenience
    beekeeper: { type: mongoose.Schema.Types.ObjectId, ref: "Beekeeper", default: null },
    collective_name: { type: String, default: null },

    // who minted it — the logged-in account. Powers personal ledgers
    createdBy: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      name: { type: String, default: null },
      role: { type: String, enum: ["beekeeper", "kvic"], default: null },
      centreId: { type: String, default: null },
      orgName: { type: String, default: null },
    },

    // one-time scan token like app.py scan_secret — QR = /verify/<hash>?s=<secret>
    scan_secret: { type: String, required: true },

    // freeze at retail — no child blocks allowed after a frozen hash appears as prev
    is_frozen: { type: Boolean, default: false },

    ipfsCid: { type: String, default: null },
    ipfsUrl: { type: String, default: null },
    pinataPinned: { type: Boolean, default: false },
    publicKey: { type: String, default: null },
    jarSerial: { type: String, default: null, index: true },
    registryKey: { type: String, default: null },

    // workflow-friendly extras that mirror diagram labels
    // lab cert fields (when stage === 'lab_certified') - CBRTI Pune testing standards
    lab: {
      ca_number: String,
      cert_hash: String,
      tester_name: String,
      cbrti_centre: { type: String, default: "cbrti-pune" },
      moisture: String, // limit <= 20%
      purity: String,
      c4_sugar_test: String, // EA-IRMS isotopic ratio
      c3_rice_syrup_test: String, // TMR/SMR markers
      hmf_level: String, // <= 80 mg/kg
      pollen_profile: String, // Melissopalynological botanical origin
      antibiotic_residue: String,
      notes: String,
    },
    // processing QA
    qa: {
      filtered: Boolean,
      pasteurized: Boolean,
      purity_test: String,
      remarks: String,
    },
    // Strict Mass-Balance Verification token (stops syrup dilution volume fraud)
    mass_balance: {
      input_weight_kg: Number,
      output_weight_kg: Number,
      variance_pct: Number,
      verified: Boolean,
    },
  },
  { timestamps: true }
);

// helpful indexes for chain walk
LedgerBlockSchema.index({ createdAt: 1 });
LedgerBlockSchema.index({ stage: 1, createdAt: -1 });

LedgerBlockSchema.statics.STAGES = STAGES;

module.exports = mongoose.model("LedgerBlock", LedgerBlockSchema);
