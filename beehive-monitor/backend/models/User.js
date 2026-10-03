const mongoose = require("mongoose");

// Two-tier accounts: `beekeeper` (steps 1–2: hive + harvest) and `kvic`
// (steps 3–8: collective → Khadi retail). Role is enforced server-side via
// JWT (see middleware/auth.js) — the old `x-role` header remains only as a
// no-login demo fallback.
const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    // Either phone or email (or both) identifies the account.
    phone: { type: String, trim: true, index: true, sparse: true },
    email: { type: String, trim: true, lowercase: true, index: true, sparse: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["beekeeper", "kvic"], required: true, index: true },
    status: { type: String, enum: ["active", "suspended"], default: "active" },

    // Beekeeper tier: link to a Beekeeper profile, bound via Aadhaar-OTP proof
    // (claim endpoint checks the KYC verifiedAt stamp + phone match).
    beekeeperId: { type: mongoose.Schema.Types.ObjectId, ref: "Beekeeper", default: null },

    // KVIC tier: the real-world centre from kvicDirectory.js this staffer
    // belongs to. Claims are self-asserted (centreVerified: false) until a
    // centre admin confirms — no admin tier yet, see README.
    assignedCentreId: { type: String, default: null, index: true },
    centreVerified: { type: Boolean, default: false },
    orgName: { type: String, trim: true, default: "" },
    designation: { type: String, trim: true, default: "" },

    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true }
);

function normalizePhone(p) {
  const d = String(p || "").replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("91")) return d.slice(2);
  if (d.length === 11 && d.startsWith("0")) return d.slice(1);
  return d;
}

UserSchema.pre("save", function (next) {
  try {
    if (this.phone) this.phone = normalizePhone(this.phone);
    if (this.email) this.email = String(this.email).trim().toLowerCase();
  } catch {}
  next();
});

// Never serialize the hash.
UserSchema.methods.toSafe = function () {
  const o = typeof this.toObject === "function" ? this.toObject() : { ...this };
  delete o.passwordHash;
  delete o.__v;
  return o;
};

module.exports = mongoose.model("User", UserSchema);
module.exports.normalizePhone = normalizePhone;
