// Two-tier accounts: `beekeeper` vs `kvic`.
//
// - Passwords: bcrypt (cost 10). Never stored or returned in plain text.
// - Sessions: stateless JWT (7-day expiry). No server session table.
// - Writes (ledger blocks, registrations) require a Bearer JWT; the `x-role`
//   header survives only for public-read labels and grants nothing.
// - Binding account -> beekeeper profile reuses the Aadhaar-OTP proof:
//   claimBeekeeper requires the KYC verifiedAt stamp plus a matching phone,
//   so only someone who read that phone's OTP can claim the profile.

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const store = require("../store/appStore");
const { normalizePhone } = require("../models/User");
const { KVIC_CENTRES } = require("../data/kvicDirectory");

function jwtSecret() {
  const s = (process.env.JWT_SECRET || "").trim();
  if (!s) console.warn("[auth] JWT_SECRET is not set — using an insecure dev fallback. Set it in backend/.env!");
  return s || "dev-only-insecure-honeychain-secret-change-me";
}

function signToken(user) {
  return jwt.sign({ sub: String(user._id), role: user.role }, jwtSecret(), { expiresIn: "7d" });
}

function validEmail(e) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(e || "").trim());
}

// POST /api/auth/register
async function register(req, res) {
  try {
    const { name, phone, email, password, role, orgName, designation, assignedCentreId, beekeeperId } = req.body || {};
    if (!name || !String(name).trim()) return res.status(400).json({ success: false, error: "Name is required." });
    if (!["beekeeper", "kvic"].includes(role)) {
      return res.status(400).json({ success: false, error: "role must be 'beekeeper' or 'kvic'." });
    }
    const cleanPhone = phone ? normalizePhone(phone) : "";
    const cleanEmail = email ? String(email).trim().toLowerCase() : "";
    if (!cleanPhone && !cleanEmail) {
      return res.status(400).json({ success: false, error: "Give a phone number and/or email — one login id is required." });
    }
    if (cleanPhone && cleanPhone.length !== 10) {
      return res.status(400).json({ success: false, error: "Phone must be a 10-digit Indian mobile number." });
    }
    if (cleanEmail && !validEmail(cleanEmail)) {
      return res.status(400).json({ success: false, error: "That email doesn't look valid." });
    }
    if (!password || String(password).length < 8) {
      return res.status(400).json({ success: false, error: "Password needs at least 8 characters." });
    }

    const payload = {
      name: String(name).trim(),
      role,
      passwordHash: await bcrypt.hash(String(password), 10),
      ...(cleanPhone ? { phone: cleanPhone } : {}),
      ...(cleanEmail ? { email: cleanEmail } : {}),
    };

    if (role === "kvic") {
      if (assignedCentreId) {
        const centre = KVIC_CENTRES.find((c) => c.id === String(assignedCentreId));
        if (!centre) return res.status(400).json({ success: false, error: "Unknown KVIC centre id." });
        payload.assignedCentreId = centre.id;
        payload.centreVerified = false; // self-asserted until a centre admin confirms
      }
      if (orgName) payload.orgName = String(orgName).trim().slice(0, 120);
      if (designation) payload.designation = String(designation).trim().slice(0, 120);
    } else if (beekeeperId) {
      // Optional immediate link — only when the profile is already OTP-verified
      // AND its phone matches this account's phone.
      const bk = await store.findBeekeeperById(String(beekeeperId));
      if (!bk) return res.status(400).json({ success: false, error: "Beekeeper profile not found." });
      const okPhone = cleanPhone && String(bk.phoneNumber || "").replace(/\D/g, "").slice(-10) === cleanPhone;
      if (!bk.aadhaarVerifiedAt || !okPhone) {
        return res.status(400).json({
          success: false,
          error: "That profile isn't OTP-verified on your phone yet — register first, then Claim via Aadhaar OTP on the Account page.",
        });
      }
      payload.beekeeperId = bk._id;
    }

    let user;
    try {
      user = await store.createUser(payload);
    } catch (e) {
      if (e.code === 11000) {
        return res.status(409).json({ success: false, error: "An account with this phone/email already exists — try logging in." });
      }
      throw e;
    }
    await store.touchLogin(user._id);
    res.status(201).json({ success: true, data: { user, token: signToken(user) } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// POST /api/auth/login { login (phone or email), password }
async function login(req, res) {
  try {
    const { login, password } = req.body || {};
    if (!login || !password) return res.status(400).json({ success: false, error: "Login id + password required." });
    const found = await store.findUserByLogin(login);
    if (!found || !found.passwordHash) {
      return res.status(401).json({ success: false, error: "No account matches — check the id or register." });
    }
    if (found.status === "suspended") {
      return res.status(403).json({ success: false, error: "This account is suspended." });
    }
    const ok = await bcrypt.compare(String(password), found.passwordHash);
    if (!ok) return res.status(401).json({ success: false, error: "Wrong password." });
    await store.touchLogin(found._id);
    const { passwordHash, __v, ...safe } = found;
    res.json({ success: true, data: { user: safe, token: signToken(found) } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// GET /api/auth/me — full profile: account + linked beekeeper + assigned centre
async function me(req, res) {
  try {
    const user = await store.findUserById(req.authUser.sub);
    if (!user) return res.status(404).json({ success: false, error: "Account not found." });
    let beekeeper = null;
    if (user.beekeeperId) beekeeper = await store.findBeekeeperById(user.beekeeperId);
    const centre = user.assignedCentreId ? KVIC_CENTRES.find((c) => c.id === user.assignedCentreId) || null : null;
    res.json({ success: true, data: { user, beekeeper, centre } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// POST /api/auth/claim-beekeeper { beekeeperId, verifiedAt } — bind an
// OTP-verified beekeeper profile to this beekeeper-tier account.
async function claimBeekeeper(req, res) {
  try {
    if (req.authUser.role !== "beekeeper") {
      return res.status(403).json({ success: false, error: "Only beekeeper-tier accounts can claim a beekeeper profile." });
    }
    const { beekeeperId, verifiedAt } = req.body || {};
    const bk = await store.findBeekeeperById(String(beekeeperId || ""));
    if (!bk) return res.status(404).json({ success: false, error: "Beekeeper profile not found." });
    const stampOk =
      bk.aadhaarVerifiedAt && verifiedAt && String(new Date(bk.aadhaarVerifiedAt).toISOString()) === String(verifiedAt);
    if (!stampOk) {
      return res.status(401).json({ success: false, error: "Complete Aadhaar OTP verification first (Get Aadhaar Info → Verify)." });
    }
    const meUser = await store.findUserById(req.authUser.sub, { withHash: false });
    const myPhone = String(meUser?.phone || "").replace(/\D/g, "").slice(-10);
    const bkPhone = String(bk.phoneNumber || "").replace(/\D/g, "").slice(-10);
    if (!myPhone || myPhone !== bkPhone) {
      return res.status(403).json({ success: false, error: "Account phone must match the profile's registered phone." });
    }
    const updated = await store.updateUser(req.authUser.sub, { beekeeperId: bk._id });
    res.json({ success: true, data: { user: updated, beekeeper: bk } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// POST /api/auth/claim-centre { centreId } — KVIC-tier staff self-assign.
async function claimCentre(req, res) {
  try {
    if (req.authUser.role !== "kvic") {
      return res.status(403).json({ success: false, error: "Only KVIC-tier accounts can claim a centre." });
    }
    const centre = KVIC_CENTRES.find((c) => c.id === String(req.body?.centreId || ""));
    if (!centre) return res.status(400).json({ success: false, error: "Unknown centre id." });
    const updated = await store.updateUser(req.authUser.sub, { assignedCentreId: centre.id, centreVerified: false });
    res.json({ success: true, data: { user: updated, centre } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// GET /api/auth/centres/:id/staff — public roster (names + roles only).
async function centreStaff(req, res) {
  try {
    const centre = KVIC_CENTRES.find((c) => c.id === String(req.params.id || ""));
    if (!centre) return res.status(404).json({ success: false, error: "Unknown centre id." });
    const staff = (await store.listUsersByCentre(centre.id))
      .filter((u) => u.role === "kvic")
      .map((u) => ({ name: u.name, orgName: u.orgName || "", designation: u.designation || "", centreVerified: Boolean(u.centreVerified) }));
    res.json({ success: true, data: { centre, staff } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = { register, login, me, claimBeekeeper, claimCentre, centreStaff, signToken };
