import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api.js";
import { useAuth } from "../context/RoleContext.jsx";
import "./Account.css";

const TIERS = [
  { key: "beekeeper", icon: "🐝", title: "Beekeeper account", desc: "Farm-gate harvest logging, hive telemetry, and Aadhaar OTP identity." },
  { key: "kvic", icon: "🏛️", title: "KVIC account", desc: "Collective lot pooling, NABL testing, packaging, and Khadi retail freeze." },
];

function loadKycProof() {
  try { return JSON.parse(localStorage.getItem("honey_kyc") || "null"); } catch { return null; }
}

export default function Account() {
  const { user, login, logout, signup, refreshUser } = useAuth();
  const [mode, setMode] = useState("login"); // login | signup
  const [tier, setTier] = useState("beekeeper");
  const [form, setForm] = useState({ name: "", login: "", phone: "", email: "", password: "", orgName: "", designation: "", centreId: "" });
  const [centres, setCentres] = useState([]);
  const [status, setStatus] = useState(null); // { ok, msg }
  const [busy, setBusy] = useState(false);
  const [kycProof] = useState(loadKycProof);
  const [claimMsg, setClaimMsg] = useState("");
  const [meData, setMeData] = useState(null);

  useEffect(() => {
    api.get("/map/kvic-centres").then((r) => setCentres(r.data.data?.centres || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (user) {
      api.get("/auth/me").then((r) => setMeData(r.data.data)).catch(() => {});
    } else setMeData(null);
  }, [user]);

  function update(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function quickLogin(loginId, pass) {
    setBusy(true);
    setStatus(null);
    try {
      await login(loginId, pass);
      setStatus({ ok: true, msg: "Logged in successfully — role tier active." });
    } catch (err) {
      setStatus({ ok: false, msg: err?.response?.data?.error || "Login failed." });
    } finally {
      setBusy(false);
    }
  }

  async function doLogin(e) {
    e.preventDefault();
    setBusy(true);
    setStatus(null);
    try {
      await login(form.login.trim(), form.password);
      setStatus({ ok: true, msg: "Welcome back — tier locked to your account." });
    } catch (err) {
      setStatus({ ok: false, msg: err?.response?.data?.error || "Login failed." });
    } finally {
      setBusy(false);
    }
  }

  async function doSignup(e) {
    e.preventDefault();
    setBusy(true);
    setStatus(null);
    try {
      const payload = {
        name: form.name.trim(),
        password: form.password,
        role: tier,
        ...(form.phone.trim() ? { phone: form.phone.trim() } : {}),
        ...(form.email.trim() ? { email: form.email.trim() } : {}),
      };
      if (tier === "kvic") {
        if (form.orgName.trim()) payload.orgName = form.orgName.trim();
        if (form.designation.trim()) payload.designation = form.designation.trim();
        if (form.centreId) payload.assignedCentreId = form.centreId;
      }
      await signup(payload);
      setStatus({ ok: true, msg: tier === "kvic" ? "KVIC account created — centre claim is self-asserted until verified." : "Beekeeper account created — link your profile below via Aadhaar OTP." });
    } catch (err) {
      setStatus({ ok: false, msg: err?.response?.data?.error || "Signup failed." });
    } finally {
      setBusy(false);
    }
  }

  async function linkVerifiedProfile() {
    if (!kycProof?.verifiedAt || !kycProof?.ids?.length) return;
    setBusy(true);
    setClaimMsg("");
    try {
      let linked = null;
      let lastErr = "";
      for (const id of kycProof.ids) {
        try {
          const res = await api.post("/auth/claim-beekeeper", { beekeeperId: id, verifiedAt: kycProof.verifiedAt });
          linked = res.data.data;
          break;
        } catch (err) {
          lastErr = err?.response?.data?.error || "Claim failed.";
        }
      }
      if (linked) {
        await refreshUser();
        const me = await api.get("/auth/me").catch(() => null);
        if (me) setMeData(me.data.data);
        setClaimMsg("✓ Profile linked — your twin and harvest blocks are now yours.");
      } else {
        setClaimMsg(`Couldn't link: ${lastErr} (account phone must match the profile's phone)`);
      }
    } finally {
      setBusy(false);
    }
  }

  async function changeCentre(e) {
    const centreId = e.target.value;
    if (!centreId) return;
    setBusy(true);
    setClaimMsg("");
    try {
      await api.post("/auth/claim-centre", { centreId });
      await refreshUser();
      const me = await api.get("/auth/me").catch(() => null);
      if (me) setMeData(me.data.data);
      setClaimMsg("✓ Centre updated (self-asserted — pending verification).");
    } catch (err) {
      setClaimMsg(err?.response?.data?.error || "Centre update failed.");
    } finally {
      setBusy(false);
    }
  }

  if (user) {
    const centre = meData?.centre || null;
    const beekeeper = meData?.beekeeper || null;
    return (
      <div className="page-container account-page">
        <div className="pagehead">
          <div>
            <h1>Account</h1>
            <p>Your tier comes from this account and travels in the login token — there is no role switch.</p>
          </div>
        </div>

        <div className="account-grid">
          <div className="card account-card">
            <div className="account-head">
              <span className="account-avatar" aria-hidden>{user.role === "kvic" ? "🏛️" : "🐝"}</span>
              <div>
                <div className="account-name">{user.name}</div>
                <div className="account-sub">{user.phone || user.email} · member since {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}</div>
              </div>
              <span className={`status-pill ${user.role === "kvic" ? "status-warning" : "status-healthy"}`}>{user.role}</span>
            </div>

            {user.role === "beekeeper" && (
              <div className="account-section">
                <h3>Linked beekeeper profile</h3>
                {beekeeper ? (
                  <div className="account-linked">
                    ✓ {beekeeper.name} · {beekeeper.village || beekeeper.district || ""}
                    {" · "}<Link to={`/twin?id=${beekeeper._id}`}>Open my twin →</Link>
                  </div>
                ) : kycProof?.verifiedAt ? (
                  <div>
                    <p className="dashboard-sub">You verified {kycProof.masked} — bind it to this account (phones must match).</p>
                    <button className="btn btn-honey" onClick={linkVerifiedProfile} disabled={busy}>Link my verified profile</button>
                  </div>
                ) : (
                  <p className="dashboard-sub">
                    No profile linked yet. <Link to="/">Register as a beekeeper</Link>, verify via <strong>Get Aadhaar Info</strong>, then come back here to link.
                  </p>
                )}
              </div>
            )}

            {user.role === "kvic" && (
              <div className="account-section">
                <h3>Assigned centre</h3>
                {centre ? (
                  <div className="account-linked">
                    ✓ {centre.name} <span className="small-muted">· {centre.city}, {centre.state}</span>{" "}
                    {!user.centreVerified && <span className="badge">self-asserted</span>}
                  </div>
                ) : (
                  <p className="dashboard-sub">No centre attached — pick your real posting below.</p>
                )}
                <label className="field">
                  <span>{centre ? "Move to a different centre" : "Attach to a centre"}</span>
                  <select value="" onChange={changeCentre} disabled={busy}>
                    <option value="">— Select a real KVIC centre —</option>
                    {centres.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} — {c.city}, {c.state}</option>
                    ))}
                  </select>
                </label>
                {(user.orgName || user.designation) && (
                  <div className="account-sub">{[user.designation, user.orgName].filter(Boolean).join(" · ")}</div>
                )}
              </div>
            )}

            {claimMsg && <div className="kyc-alert info" style={{ marginTop: 12 }}>{claimMsg}</div>}

            <div className="account-actions">
              <div className="demo-switcher-box">
                <span className="demo-switcher-title">⚡ Switch demo profile:</span>
                <div className="demo-accounts-grid">
                  {user.role !== "beekeeper" && (
                    <button
                      type="button"
                      className="demo-account-btn beekeeper"
                      onClick={async () => {
                        await logout();
                        await quickLogin("9876543210", "Password@123");
                      }}
                      disabled={busy}
                    >
                      <span className="demo-badge">🐝 Beekeeper</span>
                      <strong>Rameshwar Patel</strong>
                      <small>Hives, Genesis, Voice Harvest</small>
                    </button>
                  )}
                  {user.role !== "kvic" && (
                    <button
                      type="button"
                      className="demo-account-btn kvic"
                      onClick={async () => {
                        await logout();
                        await quickLogin("kvic.officer@kvic.gov.in", "Password@123");
                      }}
                      disabled={busy}
                    >
                      <span className="demo-badge">🏛️ KVIC Officer</span>
                      <strong>Aditya Verma</strong>
                      <small>Collection, Pooling, Retail Freeze</small>
                    </button>
                  )}
                </div>
              </div>
              <button className="btn btn-outline" onClick={logout} style={{ marginTop: 14 }}>Log out</button>
            </div>
          </div>

          <div className="card account-side">
            <h3>What your tier can do</h3>
            {user.role === "beekeeper" ? (
              <ul className="flag-list">
                <li><Link to="/" style={{ fontWeight: 600 }}>📝 Onboard / Registration Form (Genesis Block 0)</Link></li>
                <li>Log <strong>Honey Extraction</strong> on the <Link to="/ledger">Harvest Logbook</Link></li>
                <li>Track your lot on <Link to="/twin">My Twin</Link> to the Khadi shelf</li>
                <li>Verify jars at <Link to="/verify">Khadi stores</Link></li>
              </ul>
            ) : (
              <ul className="flag-list">
                <li>Collection → pooled lots → transport → processing → lab → packaging → distribution → <strong>retail freeze</strong></li>
                <li>Your name appears on your centre's map pin roster</li>
                <li>File and answer <Link to="/twin">RTI requests</Link></li>
              </ul>
            )}
            <h3>Session</h3>
            <p className="dashboard-sub">Login token, 7-day expiry. Logging out here forgets it on this device.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container account-page">
      <div className="pagehead">
        <div>
          <h1>Account</h1>
          <p>One login, two tiers — enforced by the server on every write.</p>
        </div>
      </div>

      <div className="account-grid">
        <div className="card account-card">
          <div className="demo-accounts-box">
            <div className="demo-accounts-title">
              <span>⚡ Quick Demo Login (Evaluator Access)</span>
              <small>Click to log in instantly with pre-seeded cryptographic data</small>
            </div>
            <div className="demo-accounts-grid">
              <button
                type="button"
                className="demo-account-btn beekeeper"
                onClick={() => quickLogin("9876543210", "Password@123")}
                disabled={busy}
              >
                <span className="demo-badge">🐝 Beekeeper</span>
                <strong>Rameshwar Patel</strong>
                <small>9876543210 · Beekeeper (Hives, Genesis, Voice Harvest)</small>
              </button>
              <button
                type="button"
                className="demo-account-btn kvic"
                onClick={() => quickLogin("kvic.officer@kvic.gov.in", "Password@123")}
                disabled={busy}
              >
                <span className="demo-badge">🏛️ KVIC Officer</span>
                <strong>Aditya Verma</strong>
                <small>kvic.officer@kvic.gov.in · Nodal Officer (Pooling & Retail Freeze)</small>
              </button>
            </div>
          </div>

          <div className="mode-toggle">
            <button type="button" className={`filter-btn ${mode === "login" ? "active" : ""}`} onClick={() => { setMode("login"); setStatus(null); }}>Log in</button>
            <button type="button" className={`filter-btn ${mode === "signup" ? "active" : ""}`} onClick={() => { setMode("signup"); setStatus(null); }}>Create account</button>
          </div>

          {mode === "login" ? (
            <form onSubmit={doLogin} className="create-form">
              <label className="field"><span>Phone or email</span>
                <input value={form.login} onChange={(e) => update("login", e.target.value)} placeholder="98765 43210 or you@example.org" required />
              </label>
              <label className="field"><span>Password</span>
                <input type="password" value={form.password} onChange={(e) => update("password", e.target.value)} placeholder="••••••••" required />
              </label>
              <button className="btn btn-primary" disabled={busy}>{busy ? "…" : "Log in"}</button>
            </form>
          ) : (
            <form onSubmit={doSignup} className="create-form">
              <div className="tier-tabs">
                {TIERS.map((t) => (
                  <button key={t.key} type="button" className={`tier-tab ${tier === t.key ? "active" : ""}`} onClick={() => setTier(t.key)}>
                    <span className="tier-icon">{t.icon}</span>
                    <span><strong>{t.title}</strong><small>{t.desc}</small></span>
                  </button>
                ))}
              </div>
              <div className="form-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <label className="field"><span>Full name</span>
                  <input value={form.name} onChange={(e) => update("name", e.target.value)} required />
                </label>
                <label className="field"><span>Password (8+ chars)</span>
                  <input type="password" value={form.password} onChange={(e) => update("password", e.target.value)} required minLength={8} />
                </label>
                <label className="field"><span>Phone</span>
                  <input value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="10-digit mobile" inputMode="tel" />
                </label>
                <label className="field"><span>Email</span>
                  <input value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="you@example.org" inputMode="email" />
                </label>
              </div>
              {tier === "kvic" && (
                <>
                  <div className="form-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
                    <label className="field"><span>Organisation</span>
                      <input value={form.orgName} onChange={(e) => update("orgName", e.target.value)} placeholder="e.g. KVIC State Office" />
                    </label>
                    <label className="field"><span>Designation</span>
                      <input value={form.designation} onChange={(e) => update("designation", e.target.value)} placeholder="e.g. Field Officer" />
                    </label>
                  </div>
                  <label className="field"><span>Your real KVIC centre (47 verified offices)</span>
                    <select value={form.centreId} onChange={(e) => update("centreId", e.target.value)}>
                      <option value="">— Select —</option>
                      {centres.map((c) => (
                        <option key={c.id} value={c.id}>{c.name} — {c.city}, {c.state}</option>
                      ))}
                    </select>
                  </label>
                </>
              )}
              <div className="field-hint">Phone or email (at least one) is your login id. Passwords are bcrypt-hashed; sessions are 7-day tokens.</div>
              <button className="btn btn-honey" disabled={busy}>{busy ? "…" : `Create ${tier === "kvic" ? "KVIC" : "beekeeper"} account`}</button>
            </form>
          )}
          {status && <div className={`form-msg ${status.ok ? "success" : "error"}`} style={{ marginTop: 12 }}>{status.msg}</div>}
        </div>

        <div className="card account-side">
          <h3>Why two tiers?</h3>
          <ul className="flag-list">
            <li><strong>Beekeepers</strong> prove identity with Aadhaar OTP, then own their harvest blocks.</li>
            <li><strong>KVIC staff</strong> attach to a real, published centre — visible on the map roster.</li>
            <li>Browsing is public; <em>writes</em> (register, mint, issue) need the matching logged-in tier.</li>
          </ul>
          <h3>Real centres, real sources</h3>
          <p className="dashboard-sub">47 offices with published addresses — PMEGP directory, kvic.gov.in, nbb.gov.in. Pins are city-level; the street address is authoritative.</p>
          <Link className="btn btn-outline" to="/map">Browse the map →</Link>
        </div>
      </div>
    </div>
  );
}
