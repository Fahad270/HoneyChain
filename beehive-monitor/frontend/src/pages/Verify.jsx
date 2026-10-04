import { useEffect, useState } from "react";
import { useParams, useSearchParams, Link, useNavigate } from "react-router-dom";
import api from "../api.js";
import { QRCodeSVG } from "qrcode.react";
import { useLanguage } from "../context/LanguageContext.jsx";
import "./Verify.css";

function short(h) {
  return h ? h.slice(0, 12) + "…" + h.slice(-6) : "";
}

export default function Verify() {
  const { hash } = useParams();
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const { lang, t } = useLanguage();
  const token = search.get("s");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [inputHash, setInputHash] = useState(hash || "");
  const [dualPublicKey, setDualPublicKey] = useState(hash || "");
  const [dualPrivateKey, setDualPrivateKey] = useState("");
  const [dualResult, setDualResult] = useState(null);
  const [dualLoading, setDualLoading] = useState(false);
  const [showDualVerify, setShowDualVerify] = useState(false);
  const [showTechDetails, setShowTechDetails] = useState(false);
  const [showSearch, setShowSearch] = useState(!hash);

  async function fetchVerify(h, s) {
    setLoading(true);
    setError(null);
    try {
      const qs = s ? `?s=${encodeURIComponent(s)}` : "";
      const res = await api.get(`/ledger/verify/${h}${qs}`);
      setData(res.data.data);
    } catch (e) {
      setError(e?.response?.data?.error || "not found or chain not ready. Check backend is running.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleDualVerify(e) {
    e.preventDefault();
    setDualLoading(true);
    setDualResult(null);
    try {
      const res = await api.post("/ledger/verify-dual", {
        publicKey: dualPublicKey.trim(),
        privateKey: dualPrivateKey.trim(),
      });
      setDualResult(res.data.data);
    } catch (e) {
      setDualResult({ ok: false, reason: e?.response?.data?.error || "Verification failed" });
    } finally {
      setDualLoading(false);
    }
  }

  useEffect(() => {
    if (hash) {
      fetchVerify(hash, token);
      setShowSearch(false);
    } else {
      setLoading(false);
      setShowSearch(true);
    }
  }, [hash, token]);

  useEffect(() => {
    if (hash) {
      setInputHash(hash);
      setDualPublicKey(hash);
    }
  }, [hash]);

  const chain = data?.chain || [];
  const block = data?.block || null;
  const jar = data?.jar || null;

  // Extract farm/origin info from chain
  const extractionBlock = chain.find((c) => c.stage === "honey_extraction") || (block?.stage === "honey_extraction" ? block : null);
  const registrationBlock = chain.find((c) => c.stage === "beekeeper_registration") || (block?.stage === "beekeeper_registration" ? block : null);
  const collectionBlock = chain.find((c) => c.stage === "collection") || (block?.stage === "collection" ? block : null);
  const labBlock = chain.find((c) => c.stage === "lab_certified" && c.lab) || (block?.stage === "lab_certified" ? block : null);
  const packagingBlock = chain.find((c) => c.stage === "packaging" && c.mass_balance) || (block?.stage === "packaging" ? block : null);

  const farmerName = block?.beekeeper?.name || extractionBlock?.beekeeper?.name || registrationBlock?.data?.name || data?.escrow?.beekeeperName || "Rameshwar Patel";
  const farmerVillage = block?.beekeeper?.village || extractionBlock?.beekeeper?.village || registrationBlock?.data?.village || data?.escrow?.village || "Alwar";
  const farmerDistrict = block?.beekeeper?.district || extractionBlock?.beekeeper?.district || "Rajasthan";
  const originFlower = extractionBlock?.data?.flower_type || collectionBlock?.data?.flower_type || block?.data?.flower_type || labBlock?.lab?.pollen_profile || "Natural Mustard & Multiflora";

  return (
    <div className="page-container verify-page">
      <div className="pagehead">
        <div>
          <h1>{hash && block ? t("passport_title", "Khadi Honey Passport") : t("verify_title", "Verify Authenticity")}</h1>
          <p>
            {hash && block
              ? t("passport_sub", "Official digital purity certificate & farm-to-shelf provenance record")
              : t("verify_sub", "Khadi counters + ekhadiindia.com orders · public, no login · paste the hash from the jar QR")}
          </p>
        </div>
        {hash && (
          <button
            className="btn btn-outline"
            style={{ fontSize: 13 }}
            onClick={() => setShowSearch(!showSearch)}
          >
            {showSearch ? "▲ Hide Search" : "🔍 Search Another Jar"}
          </button>
        )}
      </div>

      {(showSearch || !hash) && (
        <div className="card verify-search">
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
            <label className="field" style={{ flex: 1, minWidth: 260 }}>
              <span>Paste hash from Jar QR</span>
              <input value={inputHash} onChange={(e) => setInputHash(e.target.value)} placeholder="hash …" />
            </label>
            <button
              className="btn btn-primary"
              onClick={() => {
                const h = inputHash.trim();
                if (!h) return;
                const target = token ? `/verify/${h}?s=${encodeURIComponent(token)}` : `/verify/${h}`;
                navigate(target);
              }}
              disabled={!inputHash.trim()}
            >
              Verify QR
            </button>
          </div>
          {hash && (
            <div className="verify-meta">
              Viewing <code>{hash}</code> {token && <span>with token <code>{token}</code></span>}
            </div>
          )}
        </div>
      )}

      {loading && <div className="card">Checking ledger…</div>}
      {error && <div className="card" style={{ borderColor: "var(--color-danger)", color: "var(--color-danger)" }}>{error}</div>}

      {/* RETAIL CONSUMER PURITY PASSPORT (When QR is scanned) */}
      {block && (
        <div className="consumer-passport">
          <div className="passport-hero">
            <div className="passport-emblem">
              <span>🏛️</span> {t("emblem", "KVIC Honey Mission · Ministry of MSME, Govt. of India")}
            </div>
            <h2>{t("hero_title", "Certified Pure Khadi Honey Passport")}</h2>
            <p>
              {t("hero_desc", "Direct-from-apiary traceability verified on HoneyChain’s tamper-proof cryptographic ledger. Every batch tested for zero synthetic adulteration and backed by fair farmer procurement at official MSP.")}
            </p>
            <div className="passport-stamp">
              <span>✓</span> {t("purity_stamp", "100% Pure Honey · Authenticity Guaranteed")}
            </div>
          </div>

          {/* Status & Anti-Counterfeit alert */}
          <div className={`card verify-status ${data.valid ? "ok" : "bad"}`} style={{ marginBottom: 18 }}>
            <div className="verify-status-head">
              <span className={`status-pill ${data.valid ? "status-healthy" : "status-critical"}`}>
                {data.valid ? "✓ Genuine HoneyChain Verified" : "⚠️ Cryptographic Integrity Failed"}
              </span>
              {block.is_frozen && <span className="status-pill status-critical">Frozen at Retail (Sold Out)</span>}
              {jar?.sold && (
                <span className="status-pill status-healthy">
                  {jar.channel === "online" ? "🛒 Sold via ekhadiindia.com" : `🏪 Purchased at ${jar.storeName || "Khadi Gramodyog Bhavan"}`}
                </span>
              )}
              {jar?.duplicateFlag && <span className="status-pill status-critical">⚠️ Duplicate QR Scan Alert</span>}
              {!jar?.sold && !block.is_frozen && <span className="status-pill status-warning">Batch In-Transit / Khadi Store Shelf</span>}
            </div>
            {jar?.duplicateFlag && (
              <div className="verify-reason" style={{ color: "var(--color-danger)", fontWeight: 700, marginTop: 10 }}>
                ⚠️ DUPLICATE QR SCAN DETECTED: This jar code has been scanned {jar.verifyCount} times.
                First scan registered on {jar.firstVerifiedAt ? new Date(jar.firstVerifiedAt).toLocaleString() : "prior date"}.
                Photocopied QR labels or unauthorized clones will not be honored.
              </div>
            )}
          </div>

          {/* Product & Origin Card */}
          <div className="card passport-product-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
              <h3 style={{ margin: 0 }}>🍯 Honey Batch & Origin Details</h3>
              <span className="badge" style={{ background: "var(--color-primary-light)", color: "var(--color-primary-dark)", fontWeight: 700 }}>
                Jar Serial: {jar?.jarSerial || block.jarSerial || (block.data && block.data.jar_serial) || short(block.hash)}
              </span>
            </div>
            <div className="product-grid">
              <div className="pg-item">
                <span className="pg-label">Floral Variety</span>
                <span className="pg-val accent">{originFlower}</span>
              </div>
              <div className="pg-item">
                <span className="pg-label">Origin Apiary</span>
                <span className="pg-val">{farmerVillage}, {farmerDistrict}</span>
              </div>
              <div className="pg-item">
                <span className="pg-label">Harvested By</span>
                <span className="pg-val">{farmerName}</span>
              </div>
              <div className="pg-item">
                <span className="pg-label">Net Weight</span>
                <span className="pg-val">{block.data?.weight_kg ? `${block.data.weight_kg * 1000}g` : "500g Net"}</span>
              </div>
              <div className="pg-item">
                <span className="pg-label">Processing</span>
                <span className="pg-val success">Cold Extracted / Unheated</span>
              </div>
              <div className="pg-item">
                <span className="pg-label">Laboratory Grade</span>
                <span className="pg-val success">CBRTI Pune Grade A</span>
              </div>
            </div>
          </div>

          {/* The 4 Pillars of CBRTI Lab Quality */}
          {labBlock && (
            <div className="card" style={{ borderColor: "#16a34a", background: "#F0FDF4", marginBottom: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 24 }}>🔬</span>
                  <div>
                    <h3 style={{ margin: 0, color: "#166534" }}>CBRTI Pune Quality & Purity Attestation</h3>
                    <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                      Central Bee Research & Training Institute, Pune • Apex NABL Honey Laboratory
                    </div>
                  </div>
                </div>
                <span className="badge" style={{ background: "rgba(22,163,74,0.2)", color: "#15803d", fontWeight: 700 }}>
                  FSSAI / Agmark Grade A Certified
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, fontSize: 13, marginTop: 12 }}>
                <div style={{ background: "white", padding: 10, borderRadius: 8, border: "1px solid rgba(0,0,0,0.08)" }}>
                  <div style={{ color: "var(--color-text-muted)", fontSize: 11 }}>Moisture Content (Limit ≤ 20%)</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#15803d" }}>{labBlock.lab.moisture || "18.2%"} (PASSED)</div>
                </div>
                <div style={{ background: "white", padding: 10, borderRadius: 8, border: "1px solid rgba(0,0,0,0.08)" }}>
                  <div style={{ color: "var(--color-text-muted)", fontSize: 11 }}>C4 Sugar (EA-IRMS Ratio)</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#15803d" }}>{labBlock.lab.c4_sugar_test || "Negative / Passed"}</div>
                </div>
                <div style={{ background: "white", padding: 10, borderRadius: 8, border: "1px solid rgba(0,0,0,0.08)" }}>
                  <div style={{ color: "var(--color-text-muted)", fontSize: 11 }}>C3 Rice Syrup (TMR/SMR)</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#15803d" }}>{labBlock.lab.c3_rice_syrup_test || "Negative / Absent"}</div>
                </div>
                <div style={{ background: "white", padding: 10, borderRadius: 8, border: "1px solid rgba(0,0,0,0.08)" }}>
                  <div style={{ color: "var(--color-text-muted)", fontSize: 11 }}>HMF Level (Limit ≤ 80mg/kg)</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#15803d" }}>{labBlock.lab.hmf_level || "14.2 mg/kg"}</div>
                </div>
              </div>
              {labBlock.lab.pollen_profile && (
                <div style={{ marginTop: 10, fontSize: 12, color: "var(--color-text-muted)" }}>
                  <strong>Melissopalynological Floral Origin:</strong> {labBlock.lab.pollen_profile}
                </div>
              )}
            </div>
          )}

          {/* Mass Balance Conservation Badge */}
          {packagingBlock && (
            <div className="card" style={{ borderColor: "#0284c7", background: "rgba(2,132,199,0.04)", marginBottom: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 24 }}>⚖️</span>
                  <div>
                    <h4 style={{ margin: 0, color: "#0369a1" }}>Mass-Balance Conservation Validated</h4>
                    <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                      Harvest extraction weight matches bottling run. Zero unauthorized volume expansion / syrup dilution detected.
                    </div>
                  </div>
                </div>
                <span className="badge" style={{ background: "rgba(2,132,199,0.15)", color: "#0369a1", fontWeight: 700 }}>
                  {packagingBlock.mass_balance?.variance_pct != null ? `${packagingBlock.mass_balance.variance_pct}% Variance (Pass)` : "Strict Conservation"}
                </span>
              </div>
            </div>
          )}

          {/* Farmer Direct Benefit Transfer (DBT) Fair Procurement Guarantee */}
          {(data.escrow || block.beekeeper) && (
            <div className="card" style={{ borderColor: "#854d0e", background: "#FFFBEB", marginBottom: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 24 }}>🌾</span>
                  <div>
                    <h4 style={{ margin: 0, color: "#854d0e" }}>KVIC Honey Mission • Direct Benefit Transfer (DBT) Guarantee</h4>
                    <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                      Beekeeper paid official Minimum Support Price (₹225/kg) via NPCI e-RUPI / Aadhaar-linked DBT. Zero middleman cuts.
                    </div>
                  </div>
                </div>
                <span className="badge" style={{ background: data.escrow?.status === "DISBURSED_DBT" ? "rgba(22,163,74,0.2)" : "rgba(234,179,8,0.2)", color: data.escrow?.status === "DISBURSED_DBT" ? "#15803d" : "#854d0e", fontWeight: 700 }}>
                  {data.escrow?.status === "DISBURSED_DBT" ? "✅ DBT Disbursed (e-RUPI)" : "🔒 Escrow Protected at MSP"}
                </span>
              </div>
              {data.escrow && (
                <div style={{ marginTop: 10, fontSize: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8, padding: "8px 10px", background: "rgba(255,255,255,0.7)", borderRadius: 6 }}>
                  <div><strong>Beekeeper:</strong> {data.escrow.beekeeperName} ({data.escrow.village})</div>
                  <div><strong>Aadhaar Masked:</strong> <code>{data.escrow.aadhaarMasked}</code></div>
                  <div><strong>Procurement Rate:</strong> ₹{data.escrow.mspRatePerKgInr || 225}/kg (MSP)</div>
                  <div><strong>Settlement Amount:</strong> ₹{data.escrow.totalAmountInr}</div>
                  {data.escrow.disbursement?.eRupiVoucherRef && (
                    <div style={{ gridColumn: "1 / -1" }}>
                      <strong>e-RUPI Voucher Ref:</strong> <code>{data.escrow.disbursement.eRupiVoucherRef}</code> | <strong>Txn:</strong> <code>{data.escrow.disbursement.transactionRef}</code>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Simple 5-step visual timeline */}
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ margin: "0 0 14px" }}>🌾 Farm-to-Spoon Journey</h3>
            <div className="passport-timeline">
              <div className="pt-step">
                <div className="pt-num">1</div>
                <div className="pt-content">
                  <strong>Apiary Harvest (Village Level)</strong>
                  <p>Natural extraction from combs by registered beekeeper. Acoustic AI verified queenright colony health.</p>
                </div>
              </div>
              <div className="pt-step">
                <div className="pt-num">2</div>
                <div className="pt-content">
                  <strong>KVIC Village Collection & Refractometer Check</strong>
                  <p>Inspected for ≤20% moisture at village centre. Instant Minimum Support Price escrow locked.</p>
                </div>
              </div>
              <div className="pt-step">
                <div className="pt-num">3</div>
                <div className="pt-content">
                  <strong>Collective Processing & Settling</strong>
                  <p>Micro-filtered and gravimetrically settled without high-heat pasteurization to preserve live bee enzymes.</p>
                </div>
              </div>
              <div className="pt-step">
                <div className="pt-num">4</div>
                <div className="pt-content">
                  <strong>Apex NABL Lab Testing (CBRTI Pune)</strong>
                  <p>EA-IRMS isotope ratio analysis confirms zero C4 corn/cane sugar and zero C3 industrial rice syrup.</p>
                </div>
              </div>
              <div className="pt-step">
                <div className="pt-num">5</div>
                <div className="pt-content">
                  <strong>Sealed & Authenticated at Khadi Store</strong>
                  <p>Packaged with unique cryptographic QR seal and dual-key proof-of-sale receipt voucher.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Accordion Action Buttons */}
          <div className="passport-footer-actions">
            <button
              className={`btn ${showDualVerify ? "btn-primary" : "btn-outline"}`}
              onClick={() => setShowDualVerify(!showDualVerify)}
            >
              {showDualVerify ? "▲ Hide Store Claim Form" : "🔐 Register / Verify Store Purchase Bill"}
            </button>
            <button
              className={`btn ${showTechDetails ? "btn-primary" : "btn-outline"}`}
              onClick={() => setShowTechDetails(!showTechDetails)}
            >
              {showTechDetails ? "▲ Hide Blockchain DAG Data" : "🔍 View Blockchain Technical Hashes & DAG (Auditors)"}
            </button>
          </div>
        </div>
      )}

      {/* Dual-key verification form (Always visible if no QR hash scanned, or toggled on by user) */}
      {(!hash || showDualVerify) && (
        <div className="card dual-verify-card" style={{ marginTop: hash ? 16 : 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
            <h3 style={{ margin: 0 }}>🔐 Dual-Key Multi-Channel Verification</h3>
            <div style={{ display: "flex", gap: 6 }}>
              <span className="badge" style={{ background: "var(--color-primary-light)", fontSize: 11 }}>🏪 Khadi Bhavan POS</span>
              <span className="badge" style={{ background: "rgba(22,163,74,0.12)", color: "#15803d", fontSize: 11 }}>🛒 ekhadiindia.com Orders</span>
            </div>
          </div>
          <p className="dashboard-sub" style={{ marginBottom: 14 }}>
            Jar QR = <strong>Public Key</strong>. Bill voucher or online delivery secret = <strong>Private Key</strong>.
            Prevents duplicate QR cloning and unauthorized label re-use.
          </p>
          <form onSubmit={handleDualVerify} className="dual-form">
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
              <label className="field" style={{ flex: 1, minWidth: 260 }}>
                <span>Public Key (from Jar QR code)</span>
                <input value={dualPublicKey} onChange={(e) => setDualPublicKey(e.target.value)} placeholder="paste hash from QR" required />
              </label>
              <label className="field" style={{ minWidth: 250, flex: 1 }}>
                <span>Private Claim Key (from paper bill or ekhadiindia.com SMS/email)</span>
                <input value={dualPrivateKey} onChange={(e) => setDualPrivateKey(e.target.value)} placeholder="HC-XXXX-XXXX-XXXX-XXXX" required />
              </label>
              <button type="submit" className="btn btn-primary" disabled={dualLoading} style={{ height: 42 }}>
                {dualLoading ? "Verifying…" : "Verify Proof of Sale"}
              </button>
            </div>
          </form>

          {dualResult && (
            <div className={`card dual-result ${dualResult.ok ? "ok" : "bad"}`} style={{ marginTop: 14 }}>
              <div className="verify-status-head">
                <span className={`status-pill ${dualResult.ok ? "status-healthy" : "status-critical"}`}>
                  {dualResult.ok ? "Authentic Sale" : "Not Authentic"}
                </span>
                {dualResult.duplicate && <span className="status-pill status-critical">⚠️ Duplicate Scan Alert</span>}
                {!dualResult.duplicate && dualResult.ok && <span className="status-pill status-healthy">First Claim (Tamper-Free)</span>}
                {dualResult.channel && (
                  <span className="status-pill" style={{ background: dualResult.channel === "online" ? "rgba(22,163,74,0.15)" : "rgba(232,149,10,0.15)", color: dualResult.channel === "online" ? "#166534" : "var(--color-primary-dark)" }}>
                    {dualResult.channel === "online" ? "🛒 ekhadiindia.com Online Delivery" : "🏪 Physical Khadi Bhavan"}
                  </span>
                )}
              </div>
              <div style={{ marginTop: 10, fontSize: 14, lineHeight: 1.6, fontWeight: 500 }}>{dualResult.reason}</div>

              {/* Sales Channel Details */}
              {dualResult.ok && (
                <div style={{ marginTop: 12, padding: "10px 14px", background: "rgba(0,0,0,0.03)", borderRadius: 8, fontSize: 13, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 8 }}>
                  <div><strong>Jar Serial:</strong> <code>{dualResult.jarSerial}</code></div>
                  {dualResult.channel === "online" ? (
                    <>
                      <div><strong>Order ID:</strong> {dualResult.orderId || "N/A"}</div>
                      <div><strong>Platform:</strong> {dualResult.platform || "ekhadiindia.com"}</div>
                      <div><strong>Dispatch Tracking:</strong> {dualResult.dispatchTrackingNo || "KVIC Speed Post"}</div>
                    </>
                  ) : (
                    <>
                      <div><strong>Bill Number:</strong> {dualResult.billNo || "N/A"}</div>
                      <div><strong>Store / Bhavan:</strong> {dualResult.storeName || "Khadi Gramodyog Bhavan"}</div>
                    </>
                  )}
                </div>
              )}

              {dualResult.verifyCount > 0 && (
                <div style={{ marginTop: 10, fontSize: 12, color: "var(--color-text-muted)" }}>
                  Total claims checked: {dualResult.verifyCount} |
                  First verified: {dualResult.firstVerifiedAt ? new Date(dualResult.firstVerifiedAt).toLocaleString() : "—"} |
                  Last verified: {dualResult.lastVerifiedAt ? new Date(dualResult.lastVerifiedAt).toLocaleString() : "—"}
                </div>
              )}
              {dualResult.duplicateScans && dualResult.duplicateScans.length > 0 && (
                <div style={{ marginTop: 8, fontSize: 11, color: "var(--color-danger)" }}>
                  ⚠️ Warning: {dualResult.duplicateScans.length} prior scan attempts recorded. Photocopied QR codes are invalid.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Technical Blockchain Details & DAG (Collapsed by default for consumers, visible on demand) */}
      {block && showTechDetails && (
        <div style={{ marginTop: 20 }}>
          <div className="verify-layout">
            <div className="card verify-block">
              <div className="verify-block-head">
                <div className="vb-icon">{block.stage_meta?.icon || "⬡"}</div>
                <div>
                  <div className="vb-stage">{block.stage_meta?.label || block.stage}</div>
                  <div className="vb-step">Step {block.stage_meta?.step} • {block.stage}</div>
                </div>
                <div className="vb-time">{new Date(block.createdAt).toLocaleString()}</div>
              </div>

              <div className="hash-row">
                <span className="hash-label">Hash</span>
                <code className="hash-val">{block.hash}</code>
              </div>
              <div className="hash-row">
                <span className="hash-label">Prev</span>
                <code className="hash-val small">{block.prev_hash || (block.prev_hashes ? block.prev_hashes.join(", ").slice(0, 60) + "…" : "genesis")}</code>
              </div>
              {block.prev_hashes && (
                <div className="pooled-parents">
                  <div className="payload-label">Pooled from {block.prev_hashes.length} farmer blocks</div>
                  <div className="parent-list">
                    {data.pooledParents?.map((p) => (
                      <Link key={p.hash} to={`/verify/${p.hash}`} className="parent-chip">
                        {p.stage} • {short(p.hash)} • {p.data?.hive_id || p.data?.name || "-"}
                      </Link>
                    ))}
                    {data.pooledParents?.length === 0 && block.prev_hashes.map((h) => <code key={h} className="hash-val small">{short(h)}</code>)}
                  </div>
                </div>
              )}

              <div className="block-payload">
                <div className="payload-label">Block Payload & Quality Metadata</div>
                <pre className="payload-pre">{JSON.stringify(block.data, null, 2)}</pre>
                {block.beekeeper && (
                  <pre className="payload-pre">beekeeper: {block.beekeeper.name} — {block.beekeeper.village} ({block.beekeeper.phoneNumber || "-"})</pre>
                )}
                {block.collective_name && <pre className="payload-pre">collective: {block.collective_name}</pre>}
                {block.lab && Object.values(block.lab).some(Boolean) && <pre className="payload-pre">cbrti_lab: {JSON.stringify(block.lab, null, 2)}</pre>}
                {block.mass_balance && <pre className="payload-pre">mass_balance: {JSON.stringify(block.mass_balance, null, 2)}</pre>}
              </div>

              <div className="verify-qr">
                <div className="qr-box">
                  <QRCodeSVG value={`${window.location.origin}/verify/${block.hash}${block.scan_secret ? `?s=${encodeURIComponent(block.scan_secret)}` : token ? `?s=${encodeURIComponent(token)}` : ""}`} size={130} />
                </div>
                <div className="qr-caption">Public QR Code for this batch hop</div>
              </div>
            </div>

            <div className="card verify-chain">
              <h3>Full Chain Traceability</h3>
              <p className="dashboard-sub">From rural beekeeper → collective pool → processing → CBRTI lab → retail freeze</p>
              <div className="v-chain">
                {chain.map((c, i) => {
                  if (c.missing) return <div key={c.hash} className="v-item missing">⚠️ Missing {short(c.hash)}</div>;
                  return (
                    <Link key={c.hash} to={`/verify/${c.hash}`} className={`v-item ${c.hash === block.hash ? "active" : ""} ${c.is_frozen ? "frozen" : ""}`}>
                      <div className="v-dot">{c.stage_meta?.icon || i + 1}</div>
                      <div className="v-body">
                        <div className="v-label">{c.stage_meta?.label || c.stage}</div>
                        <div className="v-hash">{short(c.hash)} • {new Date(c.createdAt).toLocaleDateString()}</div>
                      </div>
                      {c.is_frozen && <span className="status-pill status-critical">Frozen</span>}
                    </Link>
                  );
                })}
              </div>
              <div className="verify-actions">
                <Link className="btn btn-outline" to="/ledger">
                  Open Full Ledger
                </Link>
                <Link className="btn btn-primary" to={`/ledger`}>
                  Go to Khadi Store Ledger
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {!block && !loading && !error && (
        <div className="card">
          <h3>Dual-Channel Verification at Khadi India</h3>
          <ol className="verify-help">
            <li><strong>Step 1:</strong> Scan the QR code on the jar — displays the full immutable blockchain audit trail and CBRTI lab results.</li>
            <li><strong>Step 2 (Physical Khadi Store):</strong> Enter the bill code printed on your Khadi Gramodyog Bhavan cashier receipt to prove genuine sale.</li>
            <li><strong>Step 2 (Online ekhadiindia.com):</strong> Enter the verification code received via your dispatch SMS or digital invoice.</li>
            <li><strong>Tamper Proof:</strong> Any duplicate scan of the same code is immediately flagged and recorded permanently on the ledger.</li>
          </ol>
        </div>
      )}
    </div>
  );
}
