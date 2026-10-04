import { useState, useEffect } from "react";
import { Link, Navigate } from "react-router-dom";
import api from "../api.js";
import { QRCodeSVG } from "qrcode.react";
import AadhaarKyc from "./AadhaarKyc.jsx";
import { useRole } from "../context/RoleContext.jsx";
import "./Register.css";

const CATEGORIES = ["Individual Beekeeper", "Firm", "Society", "Company"];

const SOON_SECTIONS = ["Training", "Landholding", "Migration", "Honey Supply", "Last Year Achievements", "Disease and Pest Management", "Documents Upload", "Payment"];

const STEPS = [
  { n: 1, title: "Identity & KYC", sub: "Aadhaar + personal" },
  { n: 2, title: "Contact & address", sub: "Phone + village" },
  { n: 3, title: "Apiary & business", sub: "Colonies + nominee" },
  { n: 4, title: "Review", sub: "Confirm + mint" },
];

const emptyForm = {
  aadhaarNo: "",
  name: "",
  dateOfBirth: "",
  gender: "",
  pinCode: "",
  state: "",
  district: "",
  postalAddress: "",
  phoneNumber: "",
  email: "",
  clusterId: "",
  fatherOrHusbandName: "",
  caste: "",
  noOfBeeColonies: "",
  planToIncreaseColonies: "",
  memberOfFpoCooperativeShg: "",
  educationalQualification: "",
  experienceInBeekeepingYears: "",
  businessState: "",
  businessDistrict: "",
  businessAddress: "",
  nomineeName: "",
  nomineeDob: "",
};

export default function Register() {
  const { user, authChecked } = useRole();
  const [category, setCategory] = useState(0);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(emptyForm);
  const [status, setStatus] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [genesis, setGenesis] = useState(null);
  const [clusters, setClusters] = useState([]);
  const [kycOpen, setKycOpen] = useState(false);
  const [kycInfo, setKycInfo] = useState(null); // { masked, verifiedAt, matchCount, accountName }

  useEffect(() => {
    api.get("/map/geo").then((r) => {
      setClusters(r.data.data?.clusters || []);
    }).catch(() => {});
  }, []);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  // Aadhaar-linked autofill from the KYC panel — only known form keys.
  function applyKycPrefill(prefill) {
    setForm((f) => {
      const next = { ...f };
      for (const k of Object.keys(emptyForm)) {
        if (prefill[k] !== undefined && prefill[k] !== null) next[k] = prefill[k];
      }
      return next;
    });
  }

  function go(n) {
    setErrorMsg("");
    if (status === "error") setStatus(null);
    // Light gate: identity essentials before leaving step 1.
    if (step === 1 && n > 1 && (!form.aadhaarNo.trim() || !form.name.trim())) {
      setStatus("error");
      setErrorMsg("Add your Aadhaar number and name to continue.");
      return;
    }
    setStep(Math.min(4, Math.max(1, n)));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!user) {
      setStatus("error");
      setErrorMsg("Log in first — registration mints your genesis block, so it needs a beekeeper or KVIC account.");
      return;
    }
    setStatus("saving");
    setErrorMsg("");
    setGenesis(null);
    try {
      const categoryValue = CATEGORIES[category].toLowerCase().includes("individual")
        ? "individual"
        : CATEGORIES[category].toLowerCase();
      const payload = { ...form, category: categoryValue };
      if (!payload.clusterId) delete payload.clusterId;
      const res = await api.post("/beekeepers/register", payload);
      const body = res.data.data;
      const genesisBlock = body?.genesis || res.data.genesis || null;
      setGenesis(genesisBlock);
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err?.response?.data?.error || "Something went wrong. Check the backend is running.");
    }
  }

  // Registration mints a genesis block — a private, logged-in act.
  // Logged-out visitors go to Account (login/signup) instead. Wait for the
  // persisted-session check first so returning users don't flash-redirect.
  if (authChecked && !user) {
    return <Navigate to="/account" replace />;
  }
  if (!authChecked) {
    return <div className="page-container">Loading…</div>;
  }

  const reviewRows = [
    ["Name", `${form.name || "—"}${form.gender ? ` · ${form.gender}` : ""}${form.dateOfBirth ? ` · DOB ${form.dateOfBirth}` : ""}`],
    ["Phone", `${form.phoneNumber || "—"}${kycInfo ? " · OTP verified ✓" : ""}`],
    ["Address", [form.postalAddress, form.district, form.state, form.pinCode].filter(Boolean).join(", ") || "—"],
    ["Apiary", `${form.noOfBeeColonies || "0"} colonies${form.planToIncreaseColonies ? ` · ${form.planToIncreaseColonies}` : ""}${form.memberOfFpoCooperativeShg ? ` · FPO/SHG: ${form.memberOfFpoCooperativeShg}` : ""}`],
    ["Experience", `${form.experienceInBeekeepingYears || "—"} years${form.educationalQualification ? ` · ${form.educationalQualification}` : ""}`],
    ["Nominee", form.nomineeName ? `${form.nomineeName}${form.nomineeDob ? ` · DOB ${form.nomineeDob}` : ""}` : "—"],
    ["Cluster", clusters.find((c) => c.id === form.clusterId)?.name || "None — assign later"],
  ];

  return (
    <div className="page-container register-page">
      <div className="pagehead">
        <div>
          <h1>Beekeeper registration</h1>
          <p>Step {step} of 4 · submitting mints your genesis block instantly</p>
        </div>
      </div>

      <div className="wizard-steps">
        {STEPS.map((s) => (
          <button
            key={s.n}
            type="button"
            className={`wstep${s.n === step ? " now" : ""}${s.n < step || status === "success" ? " done" : ""}`}
            onClick={() => s.n < step && go(s.n)}
            disabled={s.n > step && !(status === "success")}
          >
            <i>{s.n < step || status === "success" ? "✓" : s.n}</i>
            <div>{s.title}<small>{s.sub}</small></div>
          </button>
        ))}
      </div>

      <div className="seg">
        {CATEGORIES.map((cat, i) => (
          <button
            key={cat}
            type="button"
            className={i === category ? "on" : ""}
            onClick={() => setCategory(i)}
          >
            {cat}
          </button>
        ))}
      </div>

      <form className="card" onSubmit={handleSubmit}>
        {step === 1 && (
          <>
            <h2>Identity &amp; KYC</h2>
            <p className="sub">Verify once — name and phone lock to Aadhaar after this.</p>
            <div className="form-2col" style={{ alignItems: "end" }}>
              <label className="field">
                <span>Aadhaar number * {kycInfo && <span className="kyc-verified-pill">✓ {kycInfo.masked}</span>}</span>
                <input value={form.aadhaarNo} onChange={(e) => update("aadhaarNo", e.target.value)} placeholder="XXXX XXXX XXXX" required />
              </label>
              <div className="field">
                <span>&nbsp;</span>
                <button type="button" className="btn btn-outline" onClick={() => setKycOpen(true)}>
                  Get Aadhaar Info
                </button>
              </div>
            </div>
            {kycInfo && (
              <div className="form-msg success" style={{ fontSize: 12 }}>
                ✓ Aadhaar verified {kycInfo.verifiedAt ? `· ${new Date(kycInfo.verifiedAt).toLocaleString()}` : ""} ·
                autofilled from {kycInfo.accountName || "linked account"} · {kycInfo.matchCount} linked account(s) in our database.
              </div>
            )}
            {kycOpen && (
              <AadhaarKyc
                initialAadhaar={form.aadhaarNo}
                onClose={() => setKycOpen(false)}
                onVerified={({ prefill, masked, verifiedAt, matchCount, accountName }) => {
                  applyKycPrefill(prefill);
                  setKycInfo({ masked, verifiedAt, matchCount, accountName });
                  setKycOpen(false);
                  setStatus(null);
                }}
              />
            )}
            <div className="form-2col" style={{ marginTop: 14 }}>
              <label className="field">
                <span>Full name (as on Aadhaar) *</span>
                <input value={form.name} onChange={(e) => update("name", e.target.value)} required />
              </label>
              <label className="field">
                <span>Date of birth</span>
                <input type="date" value={form.dateOfBirth} onChange={(e) => update("dateOfBirth", e.target.value)} />
              </label>
              <label className="field">
                <span>Gender</span>
                <select value={form.gender} onChange={(e) => update("gender", e.target.value)}>
                  <option value="">-- Gender --</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label className="field">
                <span>Father / husband name</span>
                <input value={form.fatherOrHusbandName} onChange={(e) => update("fatherOrHusbandName", e.target.value)} />
              </label>
              <label className="field">
                <span>Caste</span>
                <input value={form.caste} onChange={(e) => update("caste", e.target.value)} />
              </label>
            </div>
            {status === "error" && <div className="form-msg error">{errorMsg}</div>}
            <div className="wizard-nav">
              <span />
              <button type="button" className="btn btn-primary" onClick={() => go(2)}>Continue</button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2>Contact &amp; address</h2>
            <p className="sub">Where the collective truck and the inspector find you.</p>
            <div className="form-2col">
              <label className="field">
                <span>Phone number (as on Aadhaar) *</span>
                <input value={form.phoneNumber} onChange={(e) => update("phoneNumber", e.target.value)} required />
              </label>
              <label className="field">
                <span>Email ID</span>
                <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} />
              </label>
              <label className="field">
                <span>PIN code *</span>
                <input value={form.pinCode} onChange={(e) => update("pinCode", e.target.value)} />
              </label>
              <label className="field">
                <span>State *</span>
                <select value={form.state} onChange={(e) => update("state", e.target.value)}>
                  <option value="">-- Select State --</option>
                  <option value="maharashtra">Maharashtra</option>
                  <option value="karnataka">Karnataka</option>
                  <option value="gujarat">Gujarat</option>
                  <option value="uttar pradesh">Uttar Pradesh</option>
                </select>
              </label>
              <label className="field">
                <span>District *</span>
                <input value={form.district} onChange={(e) => update("district", e.target.value)} />
              </label>
              <label className="field">
                <span>Village / town *</span>
                <input value={form.postalAddress} onChange={(e) => update("postalAddress", e.target.value)} placeholder="Village / town" />
              </label>
            </div>
            <label className="field">
              <span>Join cluster (optional)</span>
              <select value={form.clusterId || ""} onChange={(e) => update("clusterId", e.target.value || undefined)}>
                <option value="">— None —</option>
                {clusters.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} — {c.state}</option>
                ))}
              </select>
            </label>
            <div className="wizard-nav">
              <button type="button" className="btn btn-outline" onClick={() => go(1)}>Back</button>
              <button type="button" className="btn btn-primary" onClick={() => go(3)}>Continue</button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h2>Apiary &amp; business</h2>
            <p className="sub">Your bees, your experience, your nominee.</p>
            <div className="form-2col">
              <label className="field">
                <span>No. of bee colonies *</span>
                <input type="number" min="0" value={form.noOfBeeColonies} onChange={(e) => update("noOfBeeColonies", e.target.value)} />
              </label>
              <label className="field">
                <span>Plan to increase colonies</span>
                <input value={form.planToIncreaseColonies} onChange={(e) => update("planToIncreaseColonies", e.target.value)} />
              </label>
              <label className="field">
                <span>Member of FPO / Cooperative / SHG?</span>
                <select value={form.memberOfFpoCooperativeShg} onChange={(e) => update("memberOfFpoCooperativeShg", e.target.value)}>
                  <option value="">-- Select --</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </label>
              <label className="field">
                <span>Educational qualification</span>
                <input value={form.educationalQualification} onChange={(e) => update("educationalQualification", e.target.value)} />
              </label>
              <label className="field">
                <span>Experience in beekeeping (years)</span>
                <input type="number" min="0" value={form.experienceInBeekeepingYears} onChange={(e) => update("experienceInBeekeepingYears", e.target.value)} />
              </label>
              <label className="field">
                <span>Business state</span>
                <input value={form.businessState} onChange={(e) => update("businessState", e.target.value)} />
              </label>
              <label className="field">
                <span>Business district</span>
                <input value={form.businessDistrict} onChange={(e) => update("businessDistrict", e.target.value)} />
              </label>
              <label className="field">
                <span>Business address</span>
                <input value={form.businessAddress} onChange={(e) => update("businessAddress", e.target.value)} />
              </label>
              <label className="field">
                <span>Nominee name</span>
                <input value={form.nomineeName} onChange={(e) => update("nomineeName", e.target.value)} />
              </label>
              <label className="field">
                <span>Nominee DOB</span>
                <input type="date" value={form.nomineeDob} onChange={(e) => update("nomineeDob", e.target.value)} />
              </label>
            </div>
            <div className="wizard-nav">
              <button type="button" className="btn btn-outline" onClick={() => go(2)}>Back</button>
              <button type="button" className="btn btn-primary" onClick={() => go(4)}>Review</button>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <h2>Review &amp; submit</h2>
            <p className="sub">Check everything — submitting mints your genesis block instantly.</p>
            <dl className="review">
              {reviewRows.map(([k, v]) => (
                <div key={k} style={{ display: "contents" }}>
                  <dt>{k}</dt><dd>{v}</dd>
                </div>
              ))}
            </dl>
            {status === "error" && <div className="form-msg error">{errorMsg}</div>}
            {status === "success" && <div className="form-msg success">Registered successfully.</div>}
            <div className="wizard-nav">
              <button type="button" className="btn btn-outline" onClick={() => go(3)}>Back</button>
              <button type="submit" className="btn btn-primary" disabled={status === "saving"}>
                {status === "saving" ? "Saving..." : "Create account & mint genesis"}
              </button>
            </div>

            {status === "success" && genesis && (
              <div className="genesis-card">
                <div className="genesis-head">
                  <div>
                    <div className="genesis-title">First block on ledger — GENESIS</div>
                    <div className="genesis-sub">Step 1 · Beekeeper Registration · present this QR to your collective</div>
                  </div>
                  <span className="status-pill status-healthy">On-chain</span>
                </div>
                <div className="hash-row">
                  <span className="hash-label">Block hash</span>
                  <code className="hash-val">{genesis.hash}</code>
                </div>
                <div className="hash-row">
                  <span className="hash-label">Prev</span>
                  <code className="hash-val small">{genesis.prev_hash || "— genesis (no prev)"}</code>
                </div>
                <pre className="payload-pre" style={{ marginTop: 12 }}>{JSON.stringify(genesis.data || {}, null, 2)}</pre>
                <div className="genesis-actions">
                  <Link className="btn btn-primary" to={`/verify/${genesis.hash}?s=${encodeURIComponent(genesis.scan_secret || "")}`}>Verify genesis</Link>
                  <Link className="btn btn-outline" to="/ledger">Open ledger</Link>
                  <Link className="btn btn-outline" to={`/twin?id=${genesis.hash}`}>Track my twin →</Link>
                </div>
                <div className="scan-hint" style={{ marginTop: 8 }}>scan_secret: <code>{genesis.scan_secret}</code></div>
                <div className="qr-box" style={{ marginTop: 12 }}>
                  <QRCodeSVG value={`${window.location.origin}/verify/${genesis.hash}?s=${encodeURIComponent(genesis.scan_secret || "")}`} size={148} level="M" />
                </div>
                <div className="qr-caption">Beekeeper QR — scan to create extraction / pooled batch</div>
              </div>
            )}
          </>
        )}
      </form>

      <div className="soon-row">
        <span>Coming to registration next:</span>
        {SOON_SECTIONS.map((s) => <span key={s} className="badge">{s} · soon</span>)}
      </div>
    </div>
  );
}
