const mongoose = require("mongoose");

const BeekeeperSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      enum: ["individual", "firm", "society", "company"],
      default: "individual",
    },

    // Aadhaar / basic identity
    aadhaarNo: { type: String, required: true, trim: true },
    // digits-only mirror of aadhaarNo for reliable Aadhaar-linked lookup
    // (users type spaces/dashes; old rows predate this field and are matched
    // by normalizing aadhaarNo on the fly — see store.findBeekeepersByAadhaar)
    aadhaarDigits: { type: String, default: null, index: true },
    aadhaarLast4: { type: String, default: null },
    aadhaarMasked: { type: String, default: null },
    // offline UIDAI-shape check (Verhoeff) at save time — typo flag, not proof
    aadhaarValid: { type: Boolean, default: false },
    // proof of ownership: set only after OTP / DigiLocker eKYC verification
    aadhaarVerifiedAt: { type: Date, default: null },
    aadhaarVerifyMethod: { type: String, enum: ["none", "otp_demo", "digilocker"], default: "none" },
    // DigiLocker account link (DigiLocker user id after OAuth eKYC).
    // No default so the sparse index stays lean — field exists only when linked.
    digilockerId: { type: String, index: true, sparse: true },
    digilockerLinkedAt: { type: Date, default: null },
    // Issued-document refs pulled from DigiLocker (eAadhaar + others).
    // We store references + metadata, not the document binaries.
    digilockerDocs: {
      type: [
        {
          doctype: String,
          name: String,
          uri: String,
          issuer: String,
          issuedDate: String,
          fetchedAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    phoneVerified: { type: Boolean, default: false },
    name: { type: String, required: true, trim: true },
    dateOfBirth: { type: String },
    gender: { type: String },
    pinCode: { type: String },
    state: { type: String },
    district: { type: String },
    postalAddress: { type: String },
    village: { type: String },
    phoneNumber: { type: String, required: true },
    email: { type: String },
    lat: { type: Number },
    lng: { type: Number },
    clusterId: { type: String },
    pinataCid: { type: String },

    // Family / personal
    fatherOrHusbandName: { type: String },
    caste: { type: String },
    noOfBeeColonies: { type: Number, default: 0 },
    planToIncreaseColonies: { type: String },
    memberOfFpoCooperativeShg: { type: String },
    educationalQualification: { type: String },
    experienceInBeekeepingYears: { type: Number, default: 0 },

    // Business activity address
    businessState: { type: String },
    businessDistrict: { type: String },
    businessAddress: { type: String },

    // Nominee
    nomineeName: { type: String },
    nomineeDob: { type: String },

    status: {
      type: String,
      enum: ["submitted", "verified", "rejected"],
      default: "submitted",
    },
  },
  { timestamps: true }
);

const { normalizeAadhaar, maskAadhaar, verhoeffCheck } = require("../utils/aadhaar");

// Backfill the digits-only mirror + typo flag on every save so Aadhaar-linked
// lookup works regardless of how the number was typed (spaces/dashes).
BeekeeperSchema.pre("save", function (next) {
  try {
    const digits = normalizeAadhaar(this.aadhaarNo);
    if (digits && digits.length === 12) {
      this.aadhaarDigits = digits;
      this.aadhaarLast4 = digits.slice(-4);
      this.aadhaarMasked = maskAadhaar(digits);
      this.aadhaarValid =
        digits[0] !== "0" && digits[0] !== "1" && !/^(\d)\1{11}$/.test(digits) && verhoeffCheck(digits);
    }
  } catch {}
  next();
});

module.exports = mongoose.model("Beekeeper", BeekeeperSchema);
