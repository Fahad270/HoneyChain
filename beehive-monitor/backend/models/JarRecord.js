const mongoose = require("mongoose");

const JarRecordSchema = new mongoose.Schema(
  {
    jarSerial: { type: String, required: true, unique: true, index: true },
    hash: { type: String, required: true, index: true },
    publicKey: { type: String, required: true },
    ipfsCid: { type: String, default: null },
    packagingHash: { type: String, default: null },
    sold: { type: Boolean, default: false },
    billNo: { type: String, default: null },
    storeName: { type: String, default: null },
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
