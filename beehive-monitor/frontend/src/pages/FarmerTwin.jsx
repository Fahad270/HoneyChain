import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../api.js";
import { QRCodeSVG } from "qrcode.react";
import { useRole } from "../context/RoleContext.jsx";
import "./FarmerTwin.css";

const STAGE_ORDER = ["beekeeper_registration","honey_extraction","collection","pooled","transport","processing","lab_certified","packaging","distribution","retail"];

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

  useEffect(()=>{
    api.get("/beekeepers").then(r=>setBeekeepers(r.data.data||[])).catch(()=>{});
  },[]);

  // auto-load if id in url
  useEffect(()=>{
    const q = searchParams.get("id") || searchParams.get("hash");
    if(q) track(q);
  },[]);

  async function track(id){
    const q = (id || selId || hashInput || "").trim();
    if(!q){ setError("Pick a beekeeper or paste a hash"); return; }
    setLoading(true); setError(null); setData(null);
    try{
      const res = await api.get(`/ledger/twin/${encodeURIComponent(q)}`);
      setData(res.data.data);
    }catch(e){
      setError(e?.response?.data?.error || e.message);
    }finally{ setLoading(false); }
  }

  const progress = data?.progress;
  const current = data?.current;
  const journey = data?.journey || [];

  return (
    <div className="page-container twin-page">
      <div className="twin-head">
        <div>
          <div className="ledger-kicker">Bonus — Digital Twin • Track your honey</div>
          <h1>My Honey Twin</h1>
          <p className="dashboard-sub">
            Paste your genesis QR hash or pick your name. See where your honey is right now — from your hive, through the collective pool, processing and lab, to the Khadi shelf. Live on the same ledger, same chain.
          </p>
        </div>
        <div className="twin-role-hint">
          <span className={`role-pill ${role}`}>{role==="beekeeper"?"🐝 Beekeeper view":"🏛️ KVIC view"}</span>
          <span className="small-muted">Switch in header if you need to log a stage.</span>
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
                    <QRCodeSVG value={`${window.location.origin}/verify/${current.hash}?s=${current.scan_secret}`} size={110} />
                  </div>
                  <Link className="btn btn-outline" to={`/verify/${current.hash}?s=${current.scan_secret}`} style={{marginTop:8}}>Verify jar</Link>
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

          {/* Journey timeline */}
          <div className="twin-layout">
            <div className="twin-timeline">
              {journey.length===0 && <div className="card">No blocks yet. As Beekeeper, go to Ledger and add an extraction block with your genesis hash as prev. Your twin will then start moving.</div>}
              {journey.map((b,idx)=>(
                <div key={b.hash} className={`twin-card card ${b.hash===current?.hash?"current":""} ${b.is_frozen?"frozen":""}`}>
                  <div className="twin-card-head">
                    <div className="twin-card-icon">{b.stage_meta?.icon}</div>
                    <div>
                      <div className="twin-card-stage">{b.stage_meta?.label}</div>
                      <div className="twin-card-sub">Step {b.stage_meta?.step} • {new Date(b.createdAt).toLocaleString()} {b.collective_name?`• ${b.collective_name}`:""}</div>
                    </div>
                    <span className={`twin-card-pill ${idx===journey.length-1?"current":""}`}>{idx===journey.length-1?"current":"✓"}</span>
                  </div>
                  <div className="hash-row"><span className="hash-label">Hash</span><code className="hash-val">{b.hash}</code></div>
                  <div className="hash-row"><span className="hash-label">Prev</span><code className="hash-val small">{b.prev_hash || (b.prev_hashes?b.prev_hashes.join(", ").slice(0,40)+"…":"genesis")}</code></div>
                  {b.prev_hashes && <div className="twin-pooled">Pooled from {b.prev_hashes.length} farmer lots — your honey included</div>}
                  <pre className="payload-pre">{JSON.stringify(b.data,null,2)}</pre>
                  <div className="twin-card-actions">
                    <Link className="btn btn-outline" to={`/ledger`}>Open ledger</Link>
                    <Link className="btn btn-primary" to={`/verify/${b.hash}?s=${b.scan_secret}`}>Verify</Link>
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
