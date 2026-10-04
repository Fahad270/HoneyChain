import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../api.js";
import { QRCodeSVG } from "qrcode.react";
import { useRole } from "../context/RoleContext.jsx";
import "./FarmerTwin.css";

function short(h){ return h ? h.slice(0,10)+"…"+h.slice(-6) : ""; }

export default function FarmerTwin(){
  const [searchParams] = useSearchParams();
  const { role } = useRole();
  const [beekeepers, setBeekeepers] = useState([]);
  const [selId, setSelId] = useState(searchParams.get("id") || searchParams.get("hash") || "");
  const [hashInput, setHashInput] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [rtiSubject, setRtiSubject] = useState("");
  const [rtiQuestion, setRtiQuestion] = useState("");
  const [rtiSubmitting, setRtiSubmitting] = useState(false);
  const [rtiResult, setRtiResult] = useState(null);

  useEffect(()=>{
    api.get("/beekeepers").then(r=>setBeekeepers(r.data.data||[])).catch(()=>{});
  },[]);

  // auto-load if id in url
  useEffect(()=>{
    const q = searchParams.get("id") || searchParams.get("hash");
    if(q) track(q);
  },[searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  async function track(id){
    const q = (id || selId || hashInput || "").trim();
    if(!q){ setError("Pick a beekeeper or paste a hash"); return; }
    setLoading(true); setError(null); setData(null); setRtiResult(null);
    try{
      const res = await api.get(`/ledger/twin/${encodeURIComponent(q)}`);
      setData(res.data.data);
    }catch(e){
      setError(e?.response?.data?.error || e.message);
    }finally{ setLoading(false); }
  }

  async function submitRti(e) {
    e.preventDefault();
    if (!data?.query) { setError("Track honey first to file RTI"); return; }
    setRtiSubmitting(true);
    setRtiResult(null);
    try {
      const res = await api.post("/rti", {
        beekeeperId: data.query,
        subject: rtiSubject || "Where did my honey go?",
        question: rtiQuestion,
      });
      setRtiResult(res.data.data);
      setRtiSubject("");
      setRtiQuestion("");
    } catch (e) {
      setError(e?.response?.data?.error || "RTI failed");
    } finally {
      setRtiSubmitting(false);
    }
  }

  const progress = data?.progress;
  const current = data?.current;
  const journey = data?.journey || [];

  return (
    <div className="page-container twin-page">
      <div className="pagehead">
        <div>
          <h1>My Twin</h1>
          <p>Paste your genesis QR hash or pick your name — live on the same ledger, same chain</p>
        </div>
        <div className="actions">
          {role
            ? <span className="badge">{role === "beekeeper" ? "Beekeeper view" : "KVIC view"}</span>
            : <span className="badge">Public view · log in to log stages</span>}
        </div>
      </div>

      <div className="card twin-controls">
        <div className="twin-inputs">
          <label className="field" style={{flex:1}}>
            <span>Beekeeper (from register)</span>
            <select value={selId} onChange={e=>setSelId(e.target.value)}>
              <option value="">— pick —</option>
              {beekeepers.map(b=>(
                <option key={b._id} value={b._id}>{b.name} • {b.district || b.village || b.state || ""} • {b._id.slice(-6)}</option>
              ))}
            </select>
          </label>
          <div style={{display:"flex", gap:8, alignItems:"flex-end"}}>
            <label className="field" style={{minWidth:280}}>
              <span>Or paste hash (jar QR)</span>
              <input value={hashInput} onChange={e=>setHashInput(e.target.value)} placeholder="hash …" />
            </label>
            <button className="btn btn-primary" onClick={()=>track()} disabled={loading} style={{height:40}}>
              {loading?"Tracking…":"Track my honey"}
            </button>
          </div>
        </div>
        <div className="twin-examples">
          Tip: after you register, copy the genesis hash from the Register card or from Ledger. Share that hash with your collective — your twin follows the pooled lot automatically.
        </div>
      </div>

      {error && <div className="card" style={{borderColor:"var(--color-danger)", color:"var(--color-danger)"}}>{error}</div>}

      {data && (
        <>
          {/* Summary */}
          <div className="card twin-summary">
            <div className="twin-summary-top">
              <div className="twin-jar">
                <div className="jar-icon">🍯</div>
                <div className="jar-glow" />
              </div>
              <div className="twin-meta">
                <div className="twin-name">{data.beekeeper ? `${data.beekeeper.name} • ${data.beekeeper.village || data.beekeeper.district || ""}` : `Hash ${short(data.query)}`}</div>
                <div className="twin-sub">
                  {journey.length ? `${journey.length} blocks on chain • ${data.stats.totalWeight||0} kg tracked` : "No journey yet"}
                  {data.stats?.hives?.length ? ` • hives: ${data.stats.hives.join(", ")}` : ""}
                </div>
                <div className="twin-current">
                  {current ? (
                    <>
                      <span className={`status-pill ${current.is_frozen ? "status-critical" : "status-healthy"}`}>
                        {current.is_frozen ? "Frozen at Khadi — ready for sale" : `At ${current.stage_meta?.label || current.stage}`}
                      </span>
                      <span className="current-loc">
                        {current.collective_name ? ` • ${current.collective_name}` : ""}
                        {current.data?.location || current.data?.hive_id ? ` • ${current.data.location || current.data.hive_id}` : ""}
                      </span>
                    </>
                  ) : (
                    <span className="status-pill status-warning">Not yet on chain — log an extraction as Beekeeper</span>
                  )}
                </div>
                {progress && (
                  <div className="progress-bar">
                    <div className="progress-fill" style={{width: `${progress.percent}%`}} />
                  </div>
                )}
                {progress && <div className="progress-label">{progress.completed}/{progress.total} hops • {progress.percent}% to Khadi</div>}
              </div>
              {current && (
                <div className="twin-qr">
                  <div className="qr-box">
                    <QRCodeSVG value={`${window.location.origin}/verify/${current.hash}?s=${encodeURIComponent(current.scan_secret || "")}`} size={110} />
                  </div>
                  <Link className="btn btn-outline" to={`/verify/${current.hash}?s=${encodeURIComponent(current.scan_secret || "")}`} style={{marginTop:8}}>Verify jar</Link>
                </div>
              )}
            </div>
          </div>

          {/* Pipeline */}
          <div className="card pipeline">
            <h3 style={{marginBottom:8}}>Where your honey is</h3>
            <p className="dashboard-sub" style={{marginBottom:14}}>Digital twin of your lot — green is done, gold is where it is now, grey is ahead. Pooled means your honey rides with others.</p>
            <div className="pipeline-steps">
              {progress?.steps.map(s=>(
                <div key={s.stage} className={`pipe-step ${s.state}`}>
                  <div className="pipe-icon">{s.icon}</div>
                  <div className="pipe-label">{s.label}</div>
                  <div className={`pipe-dot ${s.state}`} />
                  <div className="pipe-state">{s.state==="current"?"here":s.state==="completed"?"done":"ahead"}</div>
                </div>
              ))}
            </div>
            <div className="pipeline-legend">
              <span className="legend-dot completed" /><span>done</span>
              <span className="legend-dot current" /><span>here now</span>
              <span className="legend-dot pending" /><span>ahead</span>
              <span>• Pooled = your honey merged at collective (many→one)</span>
            </div>
          </div>

          {/* Innovation 3: Automated Direct Benefit Transfer (DBT) & Smart Escrow Payouts */}
          <div className="card dbt-escrow-card" style={{ borderColor: "#ca8a04", background: "#FFFBEB", marginBottom: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 24 }}>💰</span>
                  <h3 style={{ margin: 0, color: "#854d0e" }}>KVIC Honey Mission • Direct Benefit Transfer (DBT) Smart Escrow</h3>
                </div>
                <p className="dashboard-sub" style={{ margin: "4px 0 0" }}>
                  Autonomous smart settlement on-chain: procurement funds locked at KVIC MSP (₹225/kg) and released directly to your Aadhaar/e-RUPI account upon CBRTI Pune lab attestation.
                </p>
              </div>
              <span className="badge" style={{ background: "rgba(22,163,74,0.15)", color: "#15803d", fontWeight: 700, padding: "6px 12px", borderRadius: 8 }}>
                NPCI e-RUPI / Aadhaar-Linked DBT
              </span>
            </div>

            {/* Financial stats summary */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 14 }}>
              <div style={{ background: "white", padding: 12, borderRadius: 8, border: "1px solid rgba(0,0,0,0.08)" }}>
                <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>Harvest Volume Tracked</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "var(--color-primary-dark)" }}>{data.stats?.totalWeight || 15} kg</div>
              </div>
              <div style={{ background: "white", padding: 12, borderRadius: 8, border: "1px solid rgba(0,0,0,0.08)" }}>
                <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>Official KVIC MSP Rate</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#15803d" }}>₹225 / kg</div>
              </div>
              <div style={{ background: "white", padding: 12, borderRadius: 8, border: "1px solid rgba(0,0,0,0.08)" }}>
                <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>Guaranteed Lot Value</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#854d0e" }}>₹{Math.round((data.stats?.totalWeight || 15) * 225)}</div>
              </div>
              <div style={{ background: "white", padding: 12, borderRadius: 8, border: "1px solid rgba(0,0,0,0.08)" }}>
                <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>Settlement Status</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: (data.escrows && data.escrows.some(e => e.status === "DISBURSED_DBT")) ? "#15803d" : "#ca8a04" }}>
                  {(data.escrows && data.escrows.some(e => e.status === "DISBURSED_DBT"))
                    ? "✅ Disbursed to Bank (e-RUPI)"
                    : (data.escrows && data.escrows.some(e => e.status === "COLLECTED_PENDING_LAB"))
                      ? "🔬 Lab Testing in Progress"
                      : "🔒 Escrow Locked at Harvest"}
                </div>
              </div>
            </div>

            {/* Escrow lot items */}
            {data.escrows && data.escrows.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {data.escrows.map((esc) => (
                  <div key={esc.escrowId || esc._id} style={{ background: "white", padding: 12, borderRadius: 8, border: "1px solid rgba(0,0,0,0.08)", fontSize: 13 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 6 }}>
                      <div>
                        <strong>Escrow Ref:</strong> <code>{esc.escrowId}</code> • <strong>Lot:</strong> <code>{short(esc.lotHash)}</code>
                      </div>
                      <span className={`status-pill ${esc.status === "DISBURSED_DBT" ? "status-healthy" : esc.status === "QUALITY_REJECTED" ? "status-critical" : "status-warning"}`}>
                        {esc.status === "DISBURSED_DBT" ? "✅ Payout Disbursed" : esc.status === "COLLECTED_PENDING_LAB" ? "📦 Collected by MHPU" : esc.status === "QUALITY_REJECTED" ? "⚠️ Quality Rejection" : "🔒 Locked in Escrow"}
                      </span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 8, color: "var(--color-text-muted)" }}>
                      <div>Weight: <strong>{esc.lotWeightKg} kg</strong> @ ₹{esc.mspRatePerKgInr}/kg</div>
                      <div>Total Settlement: <strong style={{ color: "#15803d" }}>₹{esc.totalAmountInr}</strong></div>
                      <div>Aadhaar Destination: <code>{esc.aadhaarMasked || "XXXX-XXXX-9999"}</code></div>
                      {esc.disbursement?.eRupiVoucherRef && (
                        <div>e-RUPI Voucher: <code>{esc.disbursement.eRupiVoucherRef}</code></div>
                      )}
                    </div>
                    {esc.cbrtiReport?.passed && (
                      <div style={{ marginTop: 8, fontSize: 12, color: "#15803d" }}>
                        ✓ Central Bee Research & Training Institute (CBRTI), Pune certified: Moisture {esc.cbrtiReport.moisture || "≤20%"} • C3/C4 Negative. Smart contract unlocked payment automatically.
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ background: "white", padding: 12, borderRadius: 8, border: "1px solid rgba(0,0,0,0.08)", fontSize: 13, color: "var(--color-text-muted)" }}>
                🔒 <strong>Smart Escrow Contract Ready:</strong> When you log a Honey Extraction or KVIC collection van records your batch, a dedicated escrow deposit will be minted here at the official KVIC MSP (₹225/kg).
              </div>
            )}
          </div>

          {/* RTI — Right to Information */}
          <div className="card rti-card">
            <h3 style={{marginBottom:8}}>📋 Right to Information (RTI)</h3>
            <p className="dashboard-sub" style={{marginBottom:14}}>
              As a beekeeper, you have the right to know exactly where your honey went. File an RTI request — the system automatically traces your honey through every hop on the ledger.
            </p>

            {rtiResult && (
              <div className="card" style={{ borderColor: "var(--color-success)", background: "var(--color-success-bg)", marginBottom: 12 }}>
                <strong>✅ RTI Filed — Transparency Report</strong>
                <div style={{ marginTop: 8, fontSize: 14, lineHeight: 1.6 }}>
                  {rtiResult.summary || "Your honey trail has been recorded. All ledger hops are immutable and timestamped."}
                </div>
                {rtiResult.request && (
                  <div style={{ marginTop: 8, fontSize: 12, color: "var(--color-text-muted)" }}>
                    Request ID: {rtiResult.request._id} • Filed: {new Date(rtiResult.request.createdAt).toLocaleString()}
                  </div>
                )}
              </div>
            )}

            <form onSubmit={submitRti} className="rti-form">
              <label className="field">
                <span>Subject</span>
                <input value={rtiSubject} onChange={(e) => setRtiSubject(e.target.value)} placeholder="Where did my honey go?" />
              </label>
              <label className="field">
                <span>Your Question</span>
                <textarea rows={3} value={rtiQuestion} onChange={(e) => setRtiQuestion(e.target.value)} placeholder="I want to know the complete journey of my honey from my hive to the retail store..." required />
              </label>
              <div className="form-msg hint">
                The system will auto-populate your honey trail: collection, lab report, packaging, distribution, and retail details.
              </div>
              <button type="submit" className="btn btn-primary" disabled={rtiSubmitting || !data?.query} style={{marginTop:8}}>
                {rtiSubmitting ? "Filing RTI…" : "File RTI — Trace My Honey"}
              </button>
              {!data?.query && <div className="form-msg error" style={{marginTop:6}}>Track your honey first to enable RTI.</div>}
            </form>
          </div>

          {/* Journey timeline */}
          <div className="twin-layout">
            <div className="story">
              {journey.length===0 && <div className="card">No blocks yet. As Beekeeper, go to Ledger and add an extraction block with your genesis hash as prev. Your twin will then start moving.</div>}
              {journey.map((b,idx)=>(
                <div key={b.hash} className={`story-item${b.prev_hashes ? " pool" : ""}`}>
                  <div className="story-card">
                    <span className="story-tag">{b.stage_meta?.label || b.stage} · Step {b.stage_meta?.step}{idx===journey.length-1 ? " · current" : ""}</span>
                    <h3>{b.collective_name || (b.beekeeper ? `${b.beekeeper.name}` : b.stage_meta?.label || b.stage)}</h3>
                    <div className="story-date">{new Date(b.createdAt).toLocaleString()}</div>
                    <div className="hash-row" style={{ marginTop: 10 }}>
                      <span className="hash-label">Hash</span><code className="hash-val">{b.hash}</code>
                    </div>
                    <div className="hash-row"><span className="hash-label">Prev</span><code className="hash-val small">{b.prev_hash || (b.prev_hashes?b.prev_hashes.join(", ").slice(0,40)+"…":"genesis")}</code></div>
                    {b.prev_hashes && <div className="story-meta">Pooled from {b.prev_hashes.length} farmer lots — your honey included</div>}
                    <pre className="payload-pre">{JSON.stringify(b.data,null,2)}</pre>
                    <div className="block-actions">
                      <Link className="btn btn-outline" to={`/ledger`}>Open ledger</Link>
                      <Link className="btn btn-primary" to={`/verify/${b.hash}?s=${b.scan_secret}`}>Verify</Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="twin-side card">
              <h3>Hive twin</h3>
              <p className="dashboard-sub">Mock telemetry for the hives that produced this honey. Live sensors will replace this in production.</p>
              <div className="hive-twin">
                <div className="hive-twin-row"><span>Brood temp</span><strong>34.9°C</strong></div>
                <div className="hive-twin-row"><span>Humidity</span><strong>63%</strong></div>
                <div className="hive-twin-row"><span>Weight</span><strong>40.4 kg</strong></div>
                <div className="hive-twin-row"><span>Battery</span><strong>60%</strong></div>
              </div>
              <div className="twin-help">
                <h4>What you can do</h4>
                <ul>
                  <li>Beekeeper: log extraction after each harvest</li>
                  <li>Collective: pool your hash with others at Ledger → Pooled</li>
                  <li>Processor, Lab, Retail: each scan previous QR and append</li>
                  <li>Share your twin link: <code>/twin?id={data.query}</code></li>
                </ul>
                <Link className="btn btn-primary" to="/ledger" style={{width:"100%", textAlign:"center"}}>Go to ledger</Link>
              </div>
            </div>
          </div>
        </>
      )}

      {!data && !loading && !error && (
        <div className="card">
          <h3>How the twin works</h3>
          <ol style={{margin:"8px 0 0 18px", lineHeight:1.7, color:"var(--color-text-muted)", fontSize:13}}>
            <li>Register at <Link to="/">Register</Link> — you get a genesis QR (first block).</li>
            <li>As Beekeeper, add an extraction block on <Link to="/ledger">Ledger</Link> with that genesis hash as prev.</li>
            <li>Your collective pools many farmers with the 3′ Pooled form — your twin then rides the shared lot automatically.</li>
            <li>Each scan adds transport, processing, lab cert, packaging, distribution, then retail freeze.</li>
            <li>Share <code>/twin?id=YOUR_HASH</code> with buyers — they see the same pipeline live.</li>
          </ol>
        </div>
      )}
    </div>
  );
}
