const mongoose = require("mongoose");

const JarRecordSchema = new mongoose.Schema(
  {
    jarSerial: { type: String, required: true, unique: true, index: true },
    hash: { type: String, required: true, index: true },
    publicKey: { type: String, required: true },
    ipfsCid: { type: String, default: null },
    packagingHash: { type: String, default: null },
    sold: { type: Boolean, default: false },
    channel: { type: String, enum: ["offline", "online"], default: "offline" },
    platform: { type: String, default: null }, // "ekhadiindia.com" or "Khadi Gramodyog Bhavan"
    orderId: { type: String, default: null }, // e-commerce order ID (e.g., "EK-2026-9810")
    customerContact: { type: String, default: null }, // Masked phone/email for e-commerce dispatch
    dispatchTrackingNo: { type: String, default: null }, // Postal/Courier tracking
    billNo: { type: String, default: null }, // Physical cashier bill number
    storeName: { type: String, default: null },
    offlineStoreId: { type: String, default: null }, // from kvicDirectory (e.g. kgb-delhi)
    privateKeyCommit: { type: String, default: null },
    verifyCount: { type: Number, default: 0 },
    lastVerifiedAt: { type: Date, default: null },
    firstVerifiedAt: { type: Date, default: null },
    duplicateFlag: { type: Boolean, default: false },
    duplicateScans: { type: [String], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("JarRecord", JarRecordSchema);
