const mongoose = require("mongoose");

const RtiRequestSchema = new mongoose.Schema(
  {
    beekeeperId: { type: String, required: true, index: true },
    beekeeperName: { type: String },
    subject: { type: String, required: true },
    question: { type: String, required: true },
    trail: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.model("RtiRequest", RtiRequestSchema);
