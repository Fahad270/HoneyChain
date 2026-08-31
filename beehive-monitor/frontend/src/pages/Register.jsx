import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../api.js";
import { QRCodeSVG } from "qrcode.react";
import "./Register.css";

const CATEGORIES = ["Individual Beekeeper", "Firm", "Society", "Company"];

const SIDE_SECTIONS = [
  { key: "basic", label: "Basic", enabled: true },
  { key: "training", label: "Training", enabled: false },
  { key: "landholding", label: "Landholding", enabled: false },
  { key: "migration", label: "Migration", enabled: false },
  { key: "honey", label: "Honey Supply", enabled: false },
  { key: "achievements", label: "Last Year Achievements", enabled: false },
  { key: "disease", label: "Disease and Pest Management", enabled: false },
  { key: "documents", label: "Documents Upload", enabled: false },
  { key: "payment", label: "Payment", enabled: false },
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
  const [category, setCategory] = useState(0);
  const [activeSection, setActiveSection] = useState("basic");
  const [form, setForm] = useState(emptyForm);
  const [status, setStatus] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [genesis, setGenesis] = useState(null);
  const [clusters, setClusters] = useState([]);

  useEffect(() => {
    api.get("/map/geo").then((r) => {
      setClusters(r.data.data?.clusters || []);
    }).catch(() => {});
  }, []);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("saving");
    setErrorMsg("");
    setGenesis(null);
    try {
      const res = await api.post("/beekeepers/register", {
        ...form,
        category: CATEGORIES[category].toLowerCase().includes("individual")
          ? "individual"
          : CATEGORIES[category].toLowerCase(),
      });
      const payload = res.data.data;
      const genesisBlock = payload?.genesis || res.data.genesis || null;
      setGenesis(genesisBlock);
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err?.response?.data?.error || "Something went wrong. Check the backend is running.");
    }
  }

  return (
    <div className="register-page">
      <div className="register-banner">
        <div className="register-banner-inner">
          <div className="register-banner-tag">National Bee Board · NBHM</div>
          <h1>Beekeeper Registration</h1>
        </div>
      </div>

      <div className="page-container register-container">
        <div className="category-tabs">
          {CATEGORIES.map((cat, i) => (
            <button
              key={cat}
              className={"category-tab" + (i === category ? " active" : "")}
              onClick={() => setCategory(i)}
            >
              {i === category && <span className="tick">✓</span>}
              {cat}
            </button>
          ))}
        </div>

        <div className="register-layout">
          <aside className="register-sidebar">
            {SIDE_SECTIONS.map((s) => (
              <button
                key={s.key}
                disabled={!s.enabled}
                className={
                  "sidebar-item" +
                  (activeSection === s.key ? " active" : "") +
                  (!s.enabled ? " disabled" : "")
                }
                onClick={() => s.enabled && setActiveSection(s.key)}
              >
                {s.label}
                {!s.enabled && <span className="soon-tag">Soon</span>}
              </button>
            ))}
          </aside>

          <form className="register-form card" onSubmit={handleSubmit}>
            <div className="form-header">
              <label className="field">
                <span>Aadhaar No</span>
                <input
                  value={form.aadhaarNo}
                  onChange={(e) => update("aadhaarNo", e.target.value)}
                  placeholder="XXXX XXXX XXXX"
                  required
                />
              </label>
              <button type="button" className="btn btn-outline">
                Get Aadhaar Info
              </button>
            </div>

            <div className="section-banner">
              Aadhaar Details <span>(Change not allowed here — update Aadhaar for changes)</span>
            </div>

            <div className="form-grid">
              <label className="field">
                <span>Name</span>
                <input value={form.name} onChange={(e) => update("name", e.target.value)} required />
              </label>
              <label className="field">
                <span>Date of Birth</span>
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
                <span>PIN Code</span>
                <input value={form.pinCode} onChange={(e) => update("pinCode", e.target.value)} />
              </label>
              <label className="field">
                <span>State</span>
                <select value={form.state} onChange={(e) => update("state", e.target.value)}>
                  <option value="">-- Select State --</option>
                  <option value="maharashtra">Maharashtra</option>
                  <option value="karnataka">Karnataka</option>
                  <option value="gujarat">Gujarat</option>
                  <option value="uttar pradesh">Uttar Pradesh</option>
                </select>
              </label>
              <label className="field">
                <span>Join Cluster (optional)</span>
                <select value={form.clusterId || ""} onChange={(e) => update("clusterId", e.target.value || undefined)}>
                  <option value="">— None —</option>
                  {clusters.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} — {c.state}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>District</span>
                <input value={form.district} onChange={(e) => update("district", e.target.value)} />
              </label>
              <label className="field">
                <span>Postal Address</span>
                <input value={form.postalAddress} onChange={(e) => update("postalAddress", e.target.value)} />
              </label>
              <label className="field">
                <span>Phone Number (as on Aadhaar)</span>
                <input value={form.phoneNumber} onChange={(e) => update("phoneNumber", e.target.value)} required />
              </label>
              <label className="field">
                <span>Email ID</span>
                <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} />
              </label>
            </div>

            <div className="form-grid">
              <label className="field">
                <span>Father / Husband Name</span>
                <input value={form.fatherOrHusbandName} onChange={(e) => update("fatherOrHusbandName", e.target.value)} />
              </label>
              <label className="field">
                <span>Caste</span>
                <input value={form.caste} onChange={(e) => update("caste", e.target.value)} />
              </label>
              <label className="field">
                <span>No. of Bee Colonies</span>
                <input type="number" min="0" value={form.noOfBeeColonies} onChange={(e) => update("noOfBeeColonies", e.target.value)} />
              </label>
              <label className="field">
                <span>Plan to Increase Colonies</span>
                <input value={form.planToIncreaseColonies} onChange={(e) => update("planToIncreaseColonies", e.target.value)} />
              </label>
              <label className="field">
                <span>Member of FPO / Cooperative / SHG?</span>
                <select
                  value={form.memberOfFpoCooperativeShg}
                  onChange={(e) => update("memberOfFpoCooperativeShg", e.target.value)}
                >
                  <option value="">-- Select --</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </label>
              <label className="field">
                <span>Educational Qualification</span>
                <input value={form.educationalQualification} onChange={(e) => update("educationalQualification", e.target.value)} />
              </label>
              <label className="field">
                <span>Experience in Beekeeping (years)</span>
                <input
                  type="number"
                  min="0"
                  value={form.experienceInBeekeepingYears}
                  onChange={(e) => update("experienceInBeekeepingYears", e.target.value)}
                />
              </label>
            </div>

            <div className="section-banner">Business Activity Address</div>
            <div className="form-grid">
              <label className="field">
                <span>State</span>
                <input value={form.businessState} onChange={(e) => update("businessState", e.target.value)} />
              </label>
              <label className="field">
                <span>District</span>
                <input value={form.businessDistrict} onChange={(e) => update("businessDistrict", e.target.value)} />
              </label>
              <label className="field field-wide">
                <span>Address</span>
                <textarea rows="2" value={form.businessAddress} onChange={(e) => update("businessAddress", e.target.value)} />
              </label>
            </div>

            <div className="section-banner">Nominee Details</div>
            <div className="form-grid">
              <label className="field">
                <span>Nominee Name</span>
                <input value={form.nomineeName} onChange={(e) => update("nomineeName", e.target.value)} />
              </label>
              <label className="field">
                <span>Nominee DOB</span>
                <input type="date" value={form.nomineeDob} onChange={(e) => update("nomineeDob", e.target.value)} />
              </label>
            </div>

            <div className="form-footer">
              {status === "success" && <span className="form-msg success">Registered successfully.</span>}
              {status === "error" && <span className="form-msg error">{errorMsg}</span>}
              <button type="submit" className="btn btn-primary" disabled={status === "saving"}>
                {status === "saving" ? "Saving..." : "Submit Registration"}
              </button>
            </div>

            {status === "success" && genesis && (
              <div className="genesis-card">
                <div className="genesis-head">
                  <span className="genesis-icon">⬡</span>
                  <div>
                    <div className="genesis-title">First block on ledger — GENESIS</div>
                    <div className="genesis-sub">Step 1 • Beekeeper Registration • Chain starts here • Present this QR to your collective</div>
                  </div>
                  <span className="status-pill status-healthy">On-chain</span>
                </div>

                <div className="genesis-grid">
                  <div className="genesis-data">
                    <div className="hash-row">
                      <span className="hash-label">Block hash</span>
                      <code className="hash-val">{genesis.hash}</code>
                    </div>
                    <div className="hash-row">
                      <span className="hash-label">Prev</span>
                      <code className="hash-val small">{genesis.prev_hash || "— genesis (no prev)"}</code>
                    </div>
                    <div className="genesis-meta">
                      <span><strong>{genesis.data?.name || form.name}</strong> • {genesis.data?.village || form.district || "—"}</span>
                      <span className="badge">{genesis.stage}</span>
                    </div>
                    <pre className="payload-pre" style={{ marginTop: 12 }}>{JSON.stringify(genesis.data || {}, null, 2)}</pre>
                    <div className="genesis-actions">
                      <Link className="btn btn-primary" to={`/verify/${genesis.hash}?s=${genesis.scan_secret}`}>Verify genesis</Link>
                      <Link className="btn btn-outline" to="/ledger">Open ledger</Link>
                      <Link className="btn btn-outline" to={`/twin?id=${genesis.hash}`}>Track my twin →</Link>
                    </div>
                    <div className="scan-hint" style={{ marginTop: 8 }}>scan_secret: <code>{genesis.scan_secret}</code> • QR = {window.location.origin}/verify/{genesis.hash.slice(0, 10)}…?s=…</div>
                  </div>
                  <div className="genesis-qr">
                    <div className="qr-box">
                      <QRCodeSVG value={`${window.location.origin}/verify/${genesis.hash}?s=${genesis.scan_secret}`} size={148} level="M" />
                    </div>
                    <div className="qr-caption">Beekeeper QR — scan to create extraction / pooled batch</div>
                    <div className="genesis-flow">
                      <span>→ Collective scans this → pools many farmers → processor scans pooled → lab scans → retail freezes → Khadi verifies</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
