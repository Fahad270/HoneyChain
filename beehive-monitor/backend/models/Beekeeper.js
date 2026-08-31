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
    name: { type: String, required: true, trim: true },
    dateOfBirth: { type: String },
    gender: { type: String },
    pinCode: { type: String },
    state: { type: String },
    district: { type: String },
    postalAddress: { type: String },
    phoneNumber: { type: String, required: true },
    email: { type: String },

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

module.exports = mongoose.model("Beekeeper", BeekeeperSchema);
