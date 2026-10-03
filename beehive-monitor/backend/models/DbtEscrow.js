const mongoose = require("mongoose");

const ESCROW_STATUSES = [
  "LOCKED_PENDING_COLLECTION", // 1. Initialized upon beekeeper extraction
  "COLLECTED_PENDING_LAB",     // 2. KVIC MHPU / Van weighed and collected raw honey
  "QUALITY_CERTIFIED",         // 3. CBRTI Pune tested and approved
  "DISBURSED_DBT",             // 4. Automated DBT / e-RUPI payment transferred directly to farmer
  "QUALITY_REJECTED",          // 5. Failed moisture (>20%) or syrup adulteration test
];

const DbtEscrowSchema = new mongoose.Schema(
  {
    escrowId: { type: String, required: true, unique: true, index: true },
    lotHash: { type: String, required: true, index: true },
    extractionHash: { type: String, default: null, index: true },
    collectionHash: { type: String, default: null, index: true },
    beekeeper: { type: mongoose.Schema.Types.ObjectId, ref: "Beekeeper", required: true },
    beekeeperName: { type: String, required: true },
    village: { type: String, default: "" },
    state: { type: String, default: "" },
    aadhaarMasked: { type: String, default: "" },
    aadhaarHash: { type: String, default: "" },
    upiVpa: { type: String, default: "" }, // e.g. "9876543210@upi" or Aadhaar-mapped bank account
    lotWeightKg: { type: Number, required: true },
    mspRatePerKgInr: { type: Number, default: 225 }, // KVIC Honey Mission MSP: ₹225/kg
    totalAmountInr: { type: Number, required: true },
    status: { type: String, enum: ESCROW_STATUSES, default: "LOCKED_PENDING_COLLECTION", index: true },
    collectionConfirmedAt: { type: Date, default: null },
    collectorName: { type: String, default: null },
    collectorCentre: { type: String, default: null },
    cbrtiAttestedAt: { type: Date, default: null },
    cbrtiReport: {
      ca_number: { type: String, default: null },
      cert_hash: { type: String, default: null },
      moisture: { type: String, default: null },
      moistureVal: { type: Number, default: null },
      c4_sugar_test: { type: String, default: null },
      c3_rice_syrup_test: { type: String, default: null },
      passed: { type: Boolean, default: null },
      labTester: { type: String, default: null },
    },
    disbursement: {
      method: { type: String, enum: ["e_RUPI_VOUCHER", "AADHAAR_DBT_TRANSFER"], default: "e_RUPI_VOUCHER" },
      eRupiVoucherRef: { type: String, default: null },
      transactionRef: { type: String, default: null },
      disbursedAt: { type: Date, default: null },
      beneficiaryBank: { type: String, default: "State Bank of India (Aadhaar Seeding)" },
      payoutStatus: { type: String, enum: ["PENDING", "SUCCESS", "REVERTED"], default: "PENDING" },
    },
    blockchainTxHash: { type: String, default: null },
    rejectionReason: { type: String, default: null },
  },
  { timestamps: true }
);

DbtEscrowSchema.statics.ESCROW_STATUSES = ESCROW_STATUSES;

module.exports = mongoose.model("DbtEscrow", DbtEscrowSchema);
