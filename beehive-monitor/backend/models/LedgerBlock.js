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
  "packaging",              // 6 — food-grade pack + label (FSSAI, batch no, nutrition)
  "distribution",           // 7 — marketing & distribution to outlets
  "retail",                 // 8 — Khadi India / outlet — freeze point
  "lab_certified",          // 5b — lab adds his block by scanning (CA, cert hash) — can interleave before retail
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

    // one-time scan token like app.py scan_secret — QR = /verify/<hash>?s=<secret>
    scan_secret: { type: String, required: true },

    // freeze at retail — no child blocks allowed after a frozen hash appears as prev
    is_frozen: { type: Boolean, default: false },

    // workflow-friendly extras that mirror diagram labels
    // lab cert fields (when stage === 'lab_certified')
    lab: {
      ca_number: String,
      cert_hash: String,
      tester_name: String,
      moisture: String,
      purity: String,
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
  },
  { timestamps: true }
);

// helpful indexes for chain walk
LedgerBlockSchema.index({ createdAt: 1 });
LedgerBlockSchema.index({ stage: 1, createdAt: -1 });

LedgerBlockSchema.statics.STAGES = STAGES;

module.exports = mongoose.model("LedgerBlock", LedgerBlockSchema);
