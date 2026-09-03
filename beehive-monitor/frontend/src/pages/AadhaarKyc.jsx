import { useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import api from "../api.js";
import "./AadhaarKyc.css";

// Aadhaar-linked lookup against OUR database.
// check (masked) -> OTP -> verify (full linked profile + form autofill).
// Also offers DigiLocker eKYC as an alternate proof path.
export default function AadhaarKyc({ initialAadhaar = "", onClose, onVerified }) {
  const [aadhaar, setAadhaar] = useState(initialAadhaar || "");
  const [step, setStep] = useState("input"); // input | otp | done
  const [check, setCheck] = useState(null);
  const [otp, setOtp] = useState("");
  const [otpMeta, setOtpMeta] = useState(null);
  const [profile, setProfile] = useState(null);
  const [busy, setBusy] = useState(null); // check | otp | verify | digi
  const [error, setError] = useState("");
  const [digi, setDigi] = useState(null);

  async function doCheck() {
    if (!aadhaar.trim()) return;
    setBusy("check");
    setError("");
    setCheck(null);
    try {
      const res = await api.get(`/kyc/aadhaar/check?no=${encodeURIComponent(aadhaar.trim())}`);
      setCheck(res.data.data);
      if (res.data.data?.valid && res.data.data?.matchCount > 0) {
        await doSendOtp(aadhaar.trim());
      }
    } catch (e) {
      setError(e?.response?.data?.error || "Could not reach the KYC service. Is the backend running?");
    } finally {
      setBusy(null);
    }
  }

  async function doSendOtp(number) {
    setBusy("otp");
    setError("");
    try {
      const res = await api.post("/kyc/aadhaar/otp", { aadhaarNo: (number ?? aadhaar).trim() });
      setOtpMeta(res.data.data);
      setStep("otp");
    } catch (e) {
      const data = e?.response?.data;
      // 404 with valid:true means number is fine but no linked accounts yet
      if (e?.response?.status === 404 && data?.valid) {
        setCheck((c) => ({ ...(c || {}), valid: true, matchCount: 0, masked: data.masked }));
      }
      setError(data?.error || "Could not send OTP.");
    } finally {
      setBusy(null);
    }
  }

  async function doVerify(e) {
    e?.preventDefault();
    if (otp.trim().length !== 6) {
      setError("Enter the 6-digit OTP.");
      return;
    }
    setBusy("verify");
    setError("");
    try {
      const res = await api.post("/kyc/aadhaar/verify", { aadhaarNo: aadhaar.trim(), otp: otp.trim() });
      setProfile(res.data.data);
      try {
        localStorage.setItem("honey_kyc", JSON.stringify({
          verifiedAt: res.data.data?.aadhaar?.verifiedAt || null,
          masked: res.data.data?.aadhaar?.masked || null,
          ids: (res.data.data?.accounts || []).map((a) => String(a.beekeeper._id)),
        }));
      } catch {}
      setStep("done");
    } catch (e) {
      setError(e?.response?.data?.error || "Verification failed.");
    } finally {
      setBusy(null);
    }
  }

  async function doDigiLocker(beekeeperId) {
    setBusy("digi");
    setError("");
    try {
      const qs = beekeeperId ? `?beekeeperId=${encodeURIComponent(beekeeperId)}` : "";
      const res = await api.get(`/kyc/digilocker/auth-url${qs}`);
      const d = res.data.data;
      setDigi(d);
      if (!d.demo && d.url) window.open(d.url, "_blank", "noopener");
    } catch (e) {
      setError(e?.response?.data?.error || "DigiLocker unavailable.");
    } finally {
      setBusy(null);
    }
  }

  function useForAutofill(account) {
    const bk = account?.beekeeper || {};
    // Persist the OTP proof so the Account page can bind this profile to a
    // beekeeper-tier login (claim checks the stamp + phone server-side).
    try {
      localStorage.setItem("honey_kyc", JSON.stringify({
        verifiedAt: profile?.aadhaar?.verifiedAt || null,
        masked: profile?.aadhaar?.masked || null,
        ids: (profile?.accounts || []).map((a) => String(a.beekeeper._id)),
      }));
    } catch {}
    const prefill = {
      aadhaarNo: bk.aadhaarNo || profile?.prefill?.aadhaarNo || aadhaar,
      name: bk.name || "",
      dateOfBirth: bk.dateOfBirth || "",
      gender: bk.gender || "",
      pinCode: bk.pinCode || "",
      state: bk.state || "",
      district: bk.district || "",
      postalAddress: bk.postalAddress || "",
      phoneNumber: bk.phoneNumber || "",
      email: bk.email || "",
      clusterId: bk.clusterId || "",
      fatherOrHusbandName: bk.fatherOrHusbandName || "",
      caste: bk.caste || "",
      noOfBeeColonies: bk.noOfBeeColonies ?? "",
      planToIncreaseColonies: bk.planToIncreaseColonies || "",
      memberOfFpoCooperativeShg: bk.memberOfFpoCooperativeShg || "",
      educationalQualification: bk.educationalQualification || "",
      experienceInBeekeepingYears: bk.experienceInBeekeepingYears ?? "",
      businessState: bk.businessState || "",
      businessDistrict: bk.businessDistrict || "",
      businessAddress: bk.businessAddress || "",
      nomineeName: bk.nomineeName || "",
      nomineeDob: bk.nomineeDob || "",
    };
    onVerified?.({
      prefill,
      masked: profile?.aadhaar?.masked,
      verifiedAt: profile?.aadhaar?.verifiedAt,
      matchCount: profile?.aadhaar?.matchCount,
      accountName: bk.name,
    });
  }

  // Portal to document.body: escapes ancestor stacking contexts / filters /
  // animations (e.g. the page rise-in) that would otherwise become the
  // containing block for position:fixed and break the overlay geometry.
  return createPortal(
    <div className="kyc-overlay" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="kyc-panel card" role="dialog" aria-label="Aadhaar verification">
        <div className="kyc-head">
          <div>
            <div className="kicker">Aadhaar-linked lookup · Our database</div>
            <h2>Get Aadhaar Info</h2>
            <p className="dashboard-sub">
              Enter the Aadhaar number — we validate it offline, find every linked beekeeper account
              in our database, and fetch its ledger blocks, jars and RTI history after an OTP check.
            </p>
          </div>
          <button type="button" className="kyc-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="kyc-steps">
          {["Verify number", "OTP check", "Linked details"].map((label, i) => {
            const idx = step === "input" ? 0 : step === "otp" ? 1 : 2;
            return (
              <div key={label} className={`kyc-step ${i < idx ? "done" : ""} ${i === idx ? "active" : ""}`}>
                <span className="kyc-step-num">{i < idx ? "✓" : i + 1}</span>
                {label}
              </div>
            );
          })}
        </div>

        {step === "input" && (
          <div className="kyc-body">
            <label className="field">
              <span>Aadhaar number (12 digits)</span>
              <input
                value={aadhaar}
                onChange={(e) => setAadhaar(e.target.value)}
                placeholder="XXXX XXXX XXXX"
                inputMode="numeric"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), doCheck())}
              />
            </label>
            <div className="kyc-actions">
              <button type="button" className="btn btn-primary" onClick={doCheck} disabled={busy === "check" || !aadhaar.trim()}>
                {busy === "check" ? "Checking…" : "Find linked accounts"}
              </button>
              <button type="button" className="btn btn-outline" onClick={() => doDigiLocker()} disabled={busy === "digi"}>
                {busy === "digi" ? "…" : "Verify with DigiLocker"}
              </button>
            </div>

            {check && !check.valid && <div className="kyc-alert bad">⚠️ {check.reason}</div>}
            {check?.valid && check.matchCount === 0 && (
              <div className="kyc-alert ok">
                ✅ Valid Aadhaar <code>{check.masked}</code> — no linked accounts in our database yet.
                Continue with a fresh registration below.
              </div>
            )}
            {digi?.demo && (
              <div className="kyc-alert info">
                <strong>DigiLocker (demo mode):</strong> {digi.message}{" "}
                <span>Meanwhile Aadhaar + OTP above resolves the same linked accounts.</span>
              </div>
            )}
          </div>
        )}

        {step === "otp" && (
          <div className="kyc-body">
            <div className="kyc-alert info">
              Found <strong>{check?.matchCount ?? otpMeta?.matchCount}</strong> linked account(s) on{" "}
              <code>{check?.masked || otpMeta?.masked}</code>
              {otpMeta?.maskedPhones?.length > 0 && (
                <> — OTP sent to {otpMeta.maskedPhones.join(", ")}</>
              )}
              . Linked names: {(check?.accounts || []).map((a) => a.name).join(", ") || "—"}
            </div>
            {otpMeta?.demoOtp && (
              <div className="kyc-alert demo">
                <strong>Demo OTP (no SMS gateway configured):</strong>{" "}
                <code className="demo-otp">{otpMeta.demoOtp}</code>
                <span> — expires in {otpMeta.expiresInSec / 60} min. Production sends this by SMS and never shows it here.</span>
              </div>
            )}
            <form onSubmit={doVerify}>
              <label className="field">
                <span>6-digit OTP</span>
                <input
                  className="otp-input"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="••••••"
                  inputMode="numeric"
                  autoFocus
                />
              </label>
              <div className="kyc-actions">
                <button type="submit" className="btn btn-primary" disabled={busy === "verify"}>
                  {busy === "verify" ? "Verifying…" : "Verify & fetch details"}
                </button>
                <button type="button" className="btn btn-outline" onClick={() => doSendOtp()} disabled={busy === "otp"}>
                  {busy === "otp" ? "Sending…" : "Resend OTP"}
                </button>
                <button type="button" className="btn btn-outline" onClick={() => { setStep("input"); setOtp(""); }}>
                  ← Change number
                </button>
              </div>
            </form>
          </div>
        )}

        {step === "done" && profile && (
          <div className="kyc-body">
            <div className="kyc-alert ok">
              ✅ Verified <code>{profile.aadhaar.masked}</code> · {profile.aadhaar.matchCount} linked account(s) ·
              every block, jar and RTI below comes from our database.
            </div>
            <div className="kyc-accounts">
              {profile.accounts.map((a) => (
                <div key={String(a.beekeeper._id)} className="kyc-account card">
                  <div className="kyc-account-head">
                    <div>
                      <div className="kyc-account-name">{a.beekeeper.name}</div>
                      <div className="kyc-account-sub">
                        {[a.beekeeper.village || a.beekeeper.district, a.beekeeper.state].filter(Boolean).join(" · ")}
                        {" · "}{a.beekeeper.phoneNumber || "no phone"}
                      </div>
                    </div>
                    <span className="status-pill status-healthy">Verified</span>
                  </div>
                  <div className="kyc-account-stats">
                    <span><strong>{a.stats.blocks}</strong> blocks</span>
                    <span>At: <strong>{a.stats.currentLabel || "—"}</strong></span>
                    <span><strong>{a.stats.totalWeight}</strong> kg tracked</span>
                    <span><strong>{a.stats.jars}</strong> jars</span>
                    <span><strong>{a.stats.rti}</strong> RTIs</span>
                    {a.stats.isFrozen && <span className="status-pill status-critical">Frozen</span>}
                  </div>
                  {a.blocks.length > 0 && (
                    <div className="kyc-blocks">
                      {a.blocks.slice(-4).map((b) => (
                        <Link key={b.hash} className="kyc-block-chip" to={`/verify/${b.hash}`}>
                          {b.stageLabel} · <code>{b.hash.slice(0, 10)}…</code>
                        </Link>
                      ))}
                    </div>
                  )}
                  {(a.beekeeper.digilockerId || (a.beekeeper.digilockerDocs || []).length > 0) && (
                    <div className="kyc-digi-box">
                      <span className="status-pill status-healthy">DigiLocker linked</span>
                      <span className="kyc-digi-docs">
                        {(a.beekeeper.digilockerDocs || []).length > 0
                          ? `${a.beekeeper.digilockerDocs.length} doc(s): ${a.beekeeper.digilockerDocs.slice(0, 3).map((d) => d.doctype || d.name).join(", ")}`
                          : "eKYC verified"}
                      </span>
                    </div>
                  )}
                  <div className="kyc-card-actions">
                    <button type="button" className="btn btn-honey" onClick={() => useForAutofill(a)}>
                      Autofill registration form ⬇
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => doDigiLocker(String(a.beekeeper._id))}
                      disabled={busy === "digi"}
                      title="Pull eAadhaar + issued docs from DigiLocker into this account"
                    >
                      Pull from DigiLocker
                    </button>
                  </div>
                  {digi?.demo && (
                    <div className="kyc-alert info" style={{ marginTop: 10 }}>
                      <strong>DigiLocker (demo mode):</strong> {digi.message}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {error && <div className="kyc-alert bad">{error}</div>}

        <p className="kyc-privacy">
          Privacy: full Aadhaar numbers are never logged or listed — pre-OTP you only ever see masked
          names. Full details are released only to the OTP-verified requester.
        </p>
      </div>
    </div>,
    document.body
  );
}
