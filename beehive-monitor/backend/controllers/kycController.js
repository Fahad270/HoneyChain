// Aadhaar-linked account resolution + DigiLocker eKYC entry points.
//
// What this does:
//   1. `check`   — offline Verhoeff validation + "do we hold accounts on this
//                  Aadhaar?" (masked names only, no PII leak).
//   2. `otp`     — demo OTP to the registered phone (stand-in for the UIDAI /
//                  SMS gateway you would use in production).
//   3. `verify`  — OTP check → returns EVERYTHING we hold on that Aadhaar:
//                  all beekeeper records, their ledger blocks + journey state,
//                  jars and RTI history, plus a form-prefill object.
//
// Privacy posture (deliberate):
//   - Full numbers are never logged and never leave the server except back to
//     the verified requester.
//   - `check` reveals only masked names — an unverified caller cannot dump PII
//     by enumerating 12-digit numbers.
//   - OTPs are sha256-hashed in memory, 5-minute expiry, 5-attempt cap.
//
// Production path (no frontend change needed):
//   - Replace the demo OTP sender with your UIDAI ASA/KUA-licensed OTP API or
//     SMS gateway, set ALLOW_DEMO_OTP=false.
//   - For DigiLocker: register as a partner, set DIGILOCKER_CLIENT_ID /
//     DIGILOCKER_CLIENT_SECRET / DIGILOCKER_REDIRECT_URI — `digilockerAuthUrl`
//     and `digilockerCallback` below already speak the real OAuth2 endpoints.

const crypto = require("crypto");
const store = require("../store/appStore");
const { validateAadhaar, maskAadhaar, last4, maskName } = require("../utils/aadhaar");
const { stageMeta, journeyFromSeeds, attributionMatch } = require("./blockchainController");

const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
// digits -> { otpHash, expiresAt, attempts }
const otpStore = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of otpStore) {
    if (v.expiresAt <= now) otpStore.delete(k);
  }
}, 60 * 1000).unref();

function demoOtpAllowed() {
  return (process.env.ALLOW_DEMO_OTP || "true").trim().toLowerCase() !== "false";
}

function maskPhone(phone) {
  const d = String(phone || "").replace(/\D/g, "");
  if (!d) return "••••";
  return `••••••${d.slice(-2)}`;
}

function newOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

function sha(s) {
  return crypto.createHash("sha256").update(String(s), "utf8").digest("hex");
}

function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

// GET /api/kyc/aadhaar/check?no=XXXX — validate + masked linked-account hint
async function checkAadhaar(req, res) {
  try {
    const v = validateAadhaar(req.query.no || req.query.aadhaarNo || "");
    if (!v.valid) {
      return res.json({ success: true, data: { valid: false, reason: v.reason, digits: v.digits } });
    }
    const matches = await store.findBeekeepersByAadhaar(v.digits);
    res.json({
      success: true,
      data: {
        valid: true,
        masked: maskAadhaar(v.digits),
        last4: last4(v.digits),
        matchCount: matches.length,
        // masked only — full details require OTP verification
        accounts: matches.map((b) => ({
          id: String(b._id),
          name: maskName(b.name),
          village: b.village || b.district || "",
          state: b.state || "",
          verified: Boolean(b.aadhaarVerifiedAt),
        })),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// POST /api/kyc/aadhaar/otp { aadhaarNo } — send (demo) OTP to registered phone
async function requestOtp(req, res) {
  try {
    const v = validateAadhaar(req.body?.aadhaarNo || "");
    if (!v.valid) return res.status(400).json({ success: false, error: v.reason });
    const matches = await store.findBeekeepersByAadhaar(v.digits);
    if (!matches.length) {
      return res.status(404).json({
        success: false,
        valid: true,
        masked: maskAadhaar(v.digits),
        error: "No accounts found on this Aadhaar in our database — continue with a fresh registration.",
      });
    }
    const otp = newOtp();
    otpStore.set(v.digits, { otpHash: sha(otp), expiresAt: Date.now() + OTP_TTL_MS, attempts: 0 });
    const phones = [...new Set(matches.map((b) => b.phoneNumber).filter(Boolean))];
    res.json({
      success: true,
      data: {
        masked: maskAadhaar(v.digits),
        matchCount: matches.length,
        maskedPhones: phones.map(maskPhone),
        expiresInSec: OTP_TTL_MS / 1000,
        // Demo stand-in for the SMS gateway. Production: send via gateway and
        // NEVER return the code. Disable with ALLOW_DEMO_OTP=false.
        ...(demoOtpAllowed() ? { demoOtp: otp, demo: true } : {}),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// Build the unified linked profile: all records + blocks + jars + RTI + prefill.
//
// Blocks resolve exactly like the farmer digital twin: directly-attributed
// blocks as seeds, then journeyFromSeeds forward — so pooled lots,
// processing, lab, packaging and retail downstream of the farmer's honey
// are all included, not just blocks that carry his beekeeper id.
async function buildLinkedProfile(digits) {
  const beekeepers = await store.findBeekeepersByAadhaar(digits);
  const allBlocks = await store.findBlocks({});
  const accounts = [];
  for (const bk of beekeepers) {
    const id = String(bk._id);
    const seeds = allBlocks.filter((b) => attributionMatch(b, id)).map((b) => b.hash);
    const blocks = journeyFromSeeds(allBlocks, seeds);
    const current = blocks.length ? blocks[blocks.length - 1] : null;
    const totalWeight = blocks.reduce(
      (s, b) => s + (Number(b.data?.weight_kg) || Number(b.data?.weight) || Number(b.data?.quantity_kg) || 0),
      0
    );
    const jarHashes = [...new Set(blocks.map((b) => b.hash))];
    const jars = (
      await Promise.all(jarHashes.map((h) => store.findJarByHash(h).catch(() => null)))
    ).filter(Boolean);
    const rti = await store.listRti(id).catch(() => []);
    accounts.push({
      beekeeper: bk,
      stats: {
        blocks: blocks.length,
        totalWeight,
        currentStage: current?.stage || null,
        currentLabel: current ? stageMeta(current.stage).label : null,
        isFrozen: Boolean(current?.is_frozen),
        tipHash: current?.hash || null,
        jars: jars.length,
        rti: rti.length,
      },
      blocks: blocks.map((b) => ({
        hash: b.hash,
        stage: b.stage,
        stageLabel: stageMeta(b.stage).label,
        createdAt: b.createdAt,
        is_frozen: Boolean(b.is_frozen),
        collective_name: b.collective_name || null,
      })),
      jars: jars.map((j) => ({
        jarSerial: j.jarSerial,
        sold: j.sold,
        storeName: j.storeName,
        billNo: j.billNo,
        verifyCount: j.verifyCount,
        duplicateFlag: j.duplicateFlag,
      })),
      rti: rti.map((r) => ({ id: String(r._id), subject: r.subject, question: r.question, createdAt: r.createdAt })),
    });
  }
  // Prefill = newest record's fields mapped onto the Register form shape.
  const newest = beekeepers[0] || null;
  const prefill = newest
    ? {
        aadhaarNo: maskAadhaar(digits),
        aadhaarDigits: digits,
        name: newest.name || "",
        dateOfBirth: newest.dateOfBirth || "",
        gender: newest.gender || "",
        pinCode: newest.pinCode || "",
        state: newest.state || "",
        district: newest.district || "",
        postalAddress: newest.postalAddress || "",
        village: newest.village || "",
        phoneNumber: newest.phoneNumber || "",
        email: newest.email || "",
        clusterId: newest.clusterId || "",
        fatherOrHusbandName: newest.fatherOrHusbandName || "",
        caste: newest.caste || "",
        noOfBeeColonies: newest.noOfBeeColonies ?? "",
        planToIncreaseColonies: newest.planToIncreaseColonies || "",
        memberOfFpoCooperativeShg: newest.memberOfFpoCooperativeShg || "",
        educationalQualification: newest.educationalQualification || "",
        experienceInBeekeepingYears: newest.experienceInBeekeepingYears ?? "",
        businessState: newest.businessState || "",
        businessDistrict: newest.businessDistrict || "",
        businessAddress: newest.businessAddress || "",
        nomineeName: newest.nomineeName || "",
        nomineeDob: newest.nomineeDob || "",
        category: newest.category || "individual",
      }
    : null;
  return { beekeepers, accounts, prefill };
}

// POST /api/kyc/aadhaar/verify { aadhaarNo, otp } — full linked-profile fetch
async function verifyOtp(req, res) {
  try {
    const v = validateAadhaar(req.body?.aadhaarNo || "");
    if (!v.valid) return res.status(400).json({ success: false, error: v.reason });
    const record = otpStore.get(v.digits);
    if (!record) {
      return res.status(400).json({ success: false, error: "No OTP requested for this Aadhaar — tap Send OTP first." });
    }
    if (record.expiresAt <= Date.now()) {
      otpStore.delete(v.digits);
      return res.status(400).json({ success: false, error: "OTP expired — request a fresh one." });
    }
    record.attempts += 1;
    if (record.attempts > OTP_MAX_ATTEMPTS) {
      otpStore.delete(v.digits);
      return res.status(429).json({ success: false, error: "Too many wrong attempts — request a fresh OTP." });
    }
    if (!safeEqual(sha(String(req.body?.otp || "").trim()), record.otpHash)) {
      return res.status(401).json({
        success: false,
        error: `Wrong OTP (${OTP_MAX_ATTEMPTS - record.attempts} tries left).`,
      });
    }
    otpStore.delete(v.digits);

    const verifiedAt = new Date().toISOString();
    const preMatches = await store.findBeekeepersByAadhaar(v.digits);
    for (const bk of preMatches) {
      await store.updateBeekeeper(bk._id, {
        aadhaarVerifiedAt: verifiedAt,
        aadhaarVerifyMethod: "otp_demo",
        phoneVerified: true,
      }).catch(() => null);
    }
    const profile = await buildLinkedProfile(v.digits);
    res.json({
      success: true,
      data: {
        aadhaar: {
          masked: maskAadhaar(v.digits),
          last4: last4(v.digits),
          verifiedAt,
          method: "otp_demo",
          matchCount: profile.beekeepers.length,
        },
        accounts: profile.accounts,
        prefill: profile.prefill,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// GET /api/kyc/aadhaar/profile?aadhaarNo=&verifiedAt= — re-fetch for an
// OTP-verified session without re-entering OTP (verifiedAt acts as the
// short-lived proof; production: replace with a signed session token).
async function verifiedProfile(req, res) {
  try {
    const v = validateAadhaar(req.query.aadhaarNo || "");
    if (!v.valid) return res.status(400).json({ success: false, error: v.reason });
    const verifiedAt = String(req.query.verifiedAt || "");
    if (!verifiedAt) return res.status(401).json({ success: false, error: "Verify OTP first." });
    const matches = await store.findBeekeepersByAadhaar(v.digits);
    const ok = matches.some((b) => b.aadhaarVerifiedAt && String(new Date(b.aadhaarVerifiedAt).toISOString()) === verifiedAt);
    if (!ok) return res.status(401).json({ success: false, error: "Verification not found — verify OTP again." });
    const profile = await buildLinkedProfile(v.digits);
    res.json({
      success: true,
      data: {
        aadhaar: { masked: maskAadhaar(v.digits), last4: last4(v.digits), verifiedAt, matchCount: matches.length },
        accounts: profile.accounts,
        prefill: profile.prefill,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// ---- DigiLocker eKYC (real endpoints, demo fallback) ----

function digilockerConfig() {
  return {
    clientId: (process.env.DIGILOCKER_CLIENT_ID || "").trim(),
    clientSecret: (process.env.DIGILOCKER_CLIENT_SECRET || "").trim(),
    redirectUri: (process.env.DIGILOCKER_REDIRECT_URI || "").trim(),
  };
}

// GET /api/kyc/digilocker/auth-url?beekeeperId= — where to send the user.
// With partner credentials: the real DigiLocker OAuth2 authorize URL.
// Without: an honest demo-mode response explaining the onboarding steps.
async function digilockerAuthUrl(req, res) {
  try {
    const { clientId, redirectUri } = digilockerConfig();
    const beekeeperId = String(req.query.beekeeperId || "");
    const state = crypto.randomBytes(8).toString("hex") + (beekeeperId ? `.${beekeeperId}` : "");
    if (!clientId || !redirectUri) {
      return res.json({
        success: true,
        data: {
          demo: true,
          message:
            "DigiLocker partner credentials are not configured. In production, register your app at digitallocker.gov.in (Requester API), set DIGILOCKER_CLIENT_ID / DIGILOCKER_CLIENT_SECRET / DIGILOCKER_REDIRECT_URI, and this endpoint returns the real OAuth2 authorize URL. Meanwhile, use Aadhaar + OTP verification above — it resolves the same linked accounts.",
          steps: [
            "Register as a DigiLocker Requester and get client_id + client_secret.",
            "Set the three DIGILOCKER_* vars in backend/.env and restart.",
            "This endpoint then returns { demo:false, url } — send the user there.",
            "DigiLocker redirects back to /api/kyc/digilocker/callback?code=…&state=… which pulls the eAadhaar doc and links digilockerId.",
          ],
        },
      });
    }
    const url =
      "https://api.digitallocker.gov.in/public/oauth2/1/authorize" +
      `?response_type=code&client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`;
    res.json({ success: true, data: { demo: false, url, state } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// GET /api/kyc/digilocker/callback?code=&state= — DigiLocker redirects here.
// Exchanges the code, pulls the user's profile + issued docs (eAadhaar first),
// and links everything to the beekeeper id carried in `state`.
async function digilockerCallback(req, res) {
  try {
    const { clientId, clientSecret, redirectUri } = digilockerConfig();
    const { code, state } = req.query;
    if (!code) return res.status(400).json({ success: false, error: "Missing ?code= from DigiLocker." });
    if (!clientId || !clientSecret || !redirectUri) {
      return res.json({
        success: true,
        data: {
          demo: true,
          message: "Demo mode — no credentials to exchange this code with. Configure DIGILOCKER_* to pull the real eAadhaar doc.",
          code: String(code).slice(0, 8) + "…",
          state: state || null,
        },
      });
    }
    // 1. code -> access token
    const tokenRes = await fetch("https://api.digitallocker.gov.in/public/oauth2/1/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: String(code),
        grant_type: "authorization_code",
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }),
    });
    const token = await tokenRes.json().catch(() => ({}));
    if (!tokenRes.ok || !token.access_token) {
      return res.status(502).json({ success: false, error: token.error || "DigiLocker token exchange failed." });
    }
    const auth = { Authorization: `Bearer ${token.access_token}` };

    // 2. verified profile (name, dob, gender, address as held by DigiLocker)
    const dlProfile = await fetch("https://api.digitallocker.gov.in/public/oauth2/1/user", { headers: auth })
      .then((r) => r.json())
      .catch(() => null);

    // 3. issued documents — eAadhaar first, then everything else
    const docs = await fetch("https://api.digitallocker.gov.in/public/oauth2/2/files/issued", { headers: auth })
      .then((r) => r.json())
      .catch(() => ({}));
    const items = Array.isArray(docs.items) ? docs.items : [];
    const pick = (re) => items.find((d) => re.test(`${d.doctype || ""} ${d.name || ""}`));
    const aadhaarDoc = pick(/aadhaar/i);
    const docRefs = items.slice(0, 25).map((d) => ({
      doctype: d.doctype || d.name || "document",
      name: d.name || d.doctype || "DigiLocker document",
      uri: d.uri || null,
      issuer: d.issuer || null,
      issuedDate: d.issueddate || d.date || null,
      fetchedAt: new Date(),
    }));

    // 4. link to our beekeeper + store doc refs (metadata only, not binaries)
    const beekeeperId = String(state || "").split(".").slice(1).join(".");
    let linked = null;
    if (beekeeperId && /^[a-f0-9]{24}$/i.test(beekeeperId)) {
      linked = await store
        .updateBeekeeper(beekeeperId, {
          digilockerId: token.digilockerid || dlProfile?.digilockerid || null,
          digilockerLinkedAt: new Date().toISOString(),
          digilockerDocs: docRefs,
          aadhaarVerifiedAt: new Date().toISOString(),
          aadhaarVerifyMethod: "digilocker",
          phoneVerified: true,
        })
        .catch(() => null);
    }
    res.json({
      success: true,
      data: {
        demo: false,
        linked: Boolean(linked),
        beekeeperId: beekeeperId || null,
        profile: dlProfile
          ? { name: dlProfile.name, dob: dlProfile.dob, gender: dlProfile.gender, address: dlProfile.address }
          : null,
        aadhaarDoc: aadhaarDoc || null,
        docsPulled: docRefs.length,
        docs: docRefs,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// GET /api/kyc/digilocker/docs?beekeeperId= — everything DigiLocker gave us
// for this account, straight from OUR database (refs + metadata).
async function digilockerDocs(req, res) {
  try {
    const bk = await store.findBeekeeperById(String(req.query.beekeeperId || ""));
    if (!bk) return res.status(404).json({ success: false, error: "Beekeeper not found." });
    res.json({
      success: true,
      data: {
        linked: Boolean(bk.digilockerId),
        digilockerId: bk.digilockerId || null,
        linkedAt: bk.digilockerLinkedAt || null,
        verifyMethod: bk.aadhaarVerifyMethod || "none",
        docs: bk.digilockerDocs || [],
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = { checkAadhaar, requestOtp, verifyOtp, verifiedProfile, digilockerAuthUrl, digilockerCallback, digilockerDocs };
