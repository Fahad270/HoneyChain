import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api.js";
import { QRCodeSVG } from "qrcode.react";
import "./Ledger.css";

const STAGE_LABEL = {
  beekeeper_registration: "Beekeeper Registration",
  honey_extraction: "Honey Extraction",
  collection: "Collection",
  pooled: "Collective Pool",
  transport: "Transport",
  processing: "Processing & QC",
  lab_certified: "Lab Certified",
  packaging: "Packaging & Labeling",
  distribution: "Distribution",
  retail: "Retail — Khadi India",
};

const STAGE_ICON = {
  beekeeper_registration: "🐝",
  honey_extraction: "🍯",
  collection: "🤝",
  pooled: "🔗",
  transport: "🚚",
  processing: "🧪",
  lab_certified: "🔬",
  packaging: "🏷️",
  distribution: "📦",
  retail: "🏪",
};

const WORKFLOW_STEPS = [
  { key: "beekeeper_registration", label: "Beekeeper", num: 1 },
  { key: "honey_extraction", label: "Extraction", num: 2 },
  { key: "collection", label: "Collection", num: 3 },
  { key: "pooled", label: "Collective", num: 3 },
  { key: "transport", label: "Transport", num: 4 },
  { key: "processing", label: "Processing", num: 5 },
  { key: "lab_certified", label: "Lab", num: 5 },
  { key: "packaging", label: "Packaging", num: 6 },
  { key: "distribution", label: "Distribution", num: 7 },
  { key: "retail", label: "Retail", num: 8 },
];

function shortHash(h) {
  if (!h) return "genesis";
  return h.slice(0, 10) + "…" + h.slice(-6);
}

export default function Ledger() {
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    stage: "honey_extraction",
    prev_hash: "",
    prev_hashes: "",
    dataRaw: '{\n  "hive_id": "HIVE-01",\n  "weight_kg": 12,\n  "flower_source": "mustard"\n}',
    collective_name: "",
  });
  const [msg, setMsg] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get("/ledger/chain");
      setBlocks(res.data.data || []);
    } catch {
      setBlocks([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (filter === "all") return blocks;
    return blocks.filter((b) => b.stage === filter);
  }, [blocks, filter]);

  const tip = blocks[blocks.length - 1] || null;
  const frozenCount = blocks.filter((b) => b.is_frozen).length;

  // workflow progress — which steps have at least one block
  const activeStages = new Set(blocks.map((b) => b.stage));

  async function handleCreate(e) {
    e.preventDefault();
    setMsg(null);
    let data;
    try {
      data = form.dataRaw ? JSON.parse(form.dataRaw) : {};
    } catch {
      setMsg({ type: "error", text: "Data is not valid JSON" });
      return;
    }
    const payload = {
      stage: form.stage,
      data,
      collective_name: form.collective_name || undefined,
    };
    if (form.stage === "pooled") {
      const arr = form.prev_hashes.split(/[,\s\n]+/).map((s) => s.trim()).filter(Boolean);
      if (arr.length < 2) {
        setMsg({ type: "error", text: "Pooled needs at least 2 prev hashes (collective batches multiple farmers)" });
        return;
      }
      payload.prev_hashes = arr;
    } else if (form.prev_hash) {
      payload.prev_hash = form.prev_hash.trim();
    }

    setCreating(true);
    try {
      const res = await api.post("/ledger/block", payload);
      setMsg({ type: "success", text: `Block minted: ${res.data.data.hash.slice(0, 12)}… stage ${res.data.data.stage}` });
      setForm((f) => ({ ...f, prev_hash: res.data.data.hash }));
      await load();
    } catch (err) {
      const m = err?.response?.data?.error || err.message || "failed";
      setMsg({ type: "error", text: m });
    } finally {
      setCreating(false);
    }
  }

  if (loading) return <div className="page-container">Loading ledger…</div>;

  return (
    <div className="page-container ledger-page">
      {/* Header */}
      <div className="ledger-head">
        <div>
          <div className="ledger-kicker">Honey Workflow 1 → 9 • Live on ledger</div>
          <h1>Honey Ledger</h1>
          <p className="dashboard-sub">
            Every hop is a block. First block after registration is your genesis QR — scan it to append the next hop.
            Collective pools many farmer blocks into one (DAG), processor scans, lab scans & certifies, retail freezes.
          </p>
        </div>
        <div className="ledger-stats">
          <div className="ledger-stat">
            <div className="ledger-stat-num">{blocks.length}</div>
            <div className="ledger-stat-label">Blocks</div>
          </div>
          <div className="ledger-stat">
            <div className="ledger-stat-num">{frozenCount}</div>
            <div className="ledger-stat-label">Frozen</div>
          </div>
          <div className="ledger-stat">
            <div className="ledger-stat-num" style={{ fontSize: 11, wordBreak: "break-all", maxWidth: 140 }}>
              {tip ? shortHash(tip.hash) : "—"}
            </div>
            <div className="ledger-stat-label">Tip</div>
          </div>
        </div>
      </div>

      {/* Workflow progress bar — diagram 1→9 */}
      <div className="card workflow-bar">
        <div className="workflow-steps">
          {WORKFLOW_STEPS.map((s) => {
            const active = activeStages.has(s.key);
            const isPooled = s.key === "pooled";
            return (
              <div key={s.key + s.num} className={`wf-step ${active ? "active" : ""} ${isPooled ? "pooled" : ""}`}>
                <div className="wf-num">{s.num}{isPooled ? "′" : ""}</div>
                <div className="wf-label">{s.label}</div>
                <div className={`wf-dot ${active ? "on" : ""}`} />
              </div>
            );
          })}
        </div>
        <div className="workflow-legend">
          <span><span className="wf-dot on" style={{ display: "inline-block", width: 8, height: 8, borderRadius: 4, verticalAlign: "middle", marginRight: 6 }} />has block</span>
          <span>3′ = collective pool (many → one)</span>
          <span>Retail freezes • Consumer only verifies</span>
        </div>
      </div>

      {/* Filter + create */}
      <div className="ledger-actions">
        <div className="ledger-filters">
          <button className={`filter-btn ${filter === "all" ? "active" : ""}`} onClick={() => setFilter("all")}>
            All
          </button>
          {Object.keys(STAGE_LABEL).map((k) => (
            <button key={k} className={`filter-btn ${filter === k ? "active" : ""}`} onClick={() => setFilter(k)}>
              {STAGE_LABEL[k]}
            </button>
          ))}
        </div>
      </div>

      <div className="ledger-layout">
        {/* Chain */}
        <div className="ledger-chain">
          {filtered.length === 0 && (
            <div className="card empty">
              No blocks yet. Register a beekeeper — first block appears here automatically.
            </div>
          )}

          <div className="chain-rail" aria-hidden>
            <div className="rail-line" />
          </div>

          {filtered.map((b, idx) => {
            const isGenesis = !b.prev_hash && (!b.prev_hashes || b.prev_hashes.length === 0);
            const isPooled = b.stage === "pooled" && b.prev_hashes && b.prev_hashes.length;
            const isFrozen = b.is_frozen;
            const veryFirst = idx === 0 && isGenesis && b.stage === "beekeeper_registration";

            return (
              <div key={b.hash} className={`block-card card ${veryFirst ? "block-genesis" : ""} ${isFrozen ? "block-frozen" : ""}`}>
                {veryFirst && <div className="genesis-badge">★ GENESIS • First block on ledger — beekeeper QR</div>}

                <div className="block-head">
                  <div className="block-icon" title={b.stage}>{STAGE_ICON[b.stage] || "⬡"}</div>
                  <div className="block-title">
                    <div className="block-stage">
                      {STAGE_LABEL[b.stage] || b.stage}
                      {isFrozen && <span className="status-pill status-critical" style={{ marginLeft: 8 }}>Frozen at retail</span>}
                      {isPooled && <span className="status-pill status-warning" style={{ marginLeft: 8 }}>DAG • {b.prev_hashes.length}→1</span>}
                    </div>
                    <div className="block-sub">
                      {b.collective_name ? <span className="badge">{b.collective_name}</span> : null}
                      {b.beekeeper ? ` ${b.beekeeper.name} • ${b.beekeeper.village}` : ""}
                      <span className="block-time">{new Date(b.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="block-step-badge">Step {b.stage_meta?.step || "•"}</div>
                </div>

                <div className="block-grid">
                  <div className="block-data">
                    <div className="hash-row">
                      <span className="hash-label">Hash</span>
                      <code className="hash-val">{b.hash}</code>
                      <button className="copy-btn" onClick={() => navigator.clipboard.writeText(b.hash)} title="Copy">⎘</button>
                    </div>
                    <div className="hash-row">
                      <span className="hash-label">Prev</span>
                      {isPooled ? (
                        <div className="prev-pooled">
                          {b.prev_hashes.map((ph) => (
                            <code key={ph} className="hash-val small">{ph.slice(0, 16)}…</code>
                          ))}
                        </div>
                      ) : (
                        <code className="hash-val small">{b.prev_hash || "— genesis"}</code>
                      )}
                    </div>

                    {/* Data pretty */}
                    <div className="block-payload">
                      <div className="payload-label">Block data</div>
                      <pre className="payload-pre">{JSON.stringify(b.data || {}, null, 2)}</pre>
                      {b.lab && Object.values(b.lab).some(Boolean) && (
                        <pre className="payload-pre">lab: {JSON.stringify(b.lab, null, 2)}</pre>
                      )}
                      {b.qa && Object.values(b.qa).some(Boolean) && (
                        <pre className="payload-pre">qa: {JSON.stringify(b.qa, null, 2)}</pre>
                      )}
                    </div>

                    <div className="block-actions">
                      <Link className="btn btn-primary" to={`/verify/${b.hash}?s=${b.scan_secret}`}>
                        Verify chain
                      </Link>
                      <button className="btn btn-outline" onClick={() => setForm((f) => ({ ...f, prev_hash: b.hash }))}>
                        Use as prev
                      </button>
                      <span className="scan-hint">scan_secret: <code>{b.scan_secret}</code></span>
                    </div>
                  </div>

                  <div className="block-qr">
                    <div className="qr-box">
                      <QRCodeSVG value={`${window.location.origin}/verify/${b.hash}?s=${b.scan_secret}`} size={140} level="M" />
                    </div>
                    <div className="qr-caption">Scan to append next hop</div>
                    <Link className="qr-link" to={`/verify/${b.hash}?s=${b.scan_secret}`}>
                      {window.location.host}/verify/{shortHash(b.hash)}?s=…
                    </Link>
                    {isFrozen && <div className="frozen-note">🔒 Frozen — no children allowed. Consumer verifies at Khadi store.</div>}
                  </div>
                </div>

                {idx < filtered.length - 1 && <div className="chain-connector">↓</div>}
              </div>
            );
          })}
        </div>

        {/* Create panel */}
        <div className="ledger-create card">
          <h3>Append next block</h3>
          <p className="dashboard-sub" style={{ marginBottom: 12 }}>
            Scan previous QR → paste hash → pick stage → add data. Collective pools many hashes with “pooled”.
          </p>

          <form onSubmit={handleCreate} className="create-form">
            <label className="field">
              <span>Stage *</span>
              <select value={form.stage} onChange={(e) => setForm((f) => ({ ...f, stage: e.target.value }))}>
                <option value="honey_extraction">2 — Honey Extraction</option>
                <option value="collection">3 — Collection (single farmer)</option>
                <option value="pooled">3′ — Collective Pool (many → one, DAG)</option>
                <option value="transport">4 — Transport to Processing Plant</option>
                <option value="processing">5 — Processing & QC (scan prev)</option>
                <option value="lab_certified">5b — Lab Certified (adds CA)</option>
                <option value="packaging">6 — Packaging & Labeling</option>
                <option value="distribution">7 — Distribution</option>
                <option value="retail">8 — Retail — Khadi India (FREEZE)</option>
              </select>
            </label>

            {form.stage === "pooled" ? (
              <label className="field">
                <span>Prev hashes * (paste 2+ hashes, comma or newline separated — collective batches multiple farmers)</span>
                <textarea rows={3} value={form.prev_hashes} onChange={(e) => setForm((f) => ({ ...f, prev_hashes: e.target.value }))} placeholder="hash1, hash2, hash3 …" />
              </label>
            ) : (
              <label className="field">
                <span>Prev hash (scan previous QR; leave blank only for genesis)</span>
                <input value={form.prev_hash} onChange={(e) => setForm((f) => ({ ...f, prev_hash: e.target.value }))} placeholder="paste hash from QR above" />
              </label>
            )}

            <label className="field">
              <span>Collective name (for pooled / Khadi store)</span>
              <input value={form.collective_name} onChange={(e) => setForm((f) => ({ ...f, collective_name: e.target.value }))} placeholder="Nashik Madhu Collective / Khadi India — Connaught Place" />
            </label>

            <label className="field">
              <span>Block data (JSON — any stage fields, hashed canonically)</span>
              <textarea rows={7} value={form.dataRaw} onChange={(e) => setForm((f) => ({ ...f, dataRaw: e.target.value }))} />
            </label>

            <div className="field-hint">
              Examples: extraction →{" "}
              <code>{`{"hive_id":"HIVE-01","weight_kg":12,"flower":"mustard"}`}</code>
              <br />
              processing → <code>{`{"filtered":true,"pasteurized":true,"moisture":"18%","fssai":"ok"}`}</code>
              <br />
              lab →{" "}
              <code>{`{"ca_number":"CA/KVIC/2024/118","cert_hash":"sha256:abc…","tester":"NABL Lab Pune"}`}</code>
            </div>

            {msg && <div className={`form-msg ${msg.type}`}>{msg.text}</div>}

            <button type="submit" className="btn btn-primary" disabled={creating} style={{ width: "100%", marginTop: 8 }}>
              {creating ? "Minting…" : form.stage === "pooled" ? "Pool & mint convergent block" : "Mint block"}
            </button>
          </form>

          <div className="ledger-help">
            <h4>How the chain follows your diagram</h4>
            <ol>
              <li><strong>Reg</strong> → first block + QR shown right after Register</li>
              <li><strong>Collective</strong> picks many farmer hashes → <em>pooled</em> (many→one)</li>
              <li><strong>Processor</strong> scans pooled QR → adds <em>processing</em></li>
              <li><strong>Lab</strong> scans processing QR → adds <em>lab_certified</em></li>
              <li><strong>Retail</strong> scans → <em>retail</em> → chain <strong>freezes</strong></li>
              <li><strong>Consumer</strong> at Khadi store only <Link to={tip ? `/verify/${tip.hash}` : "/verify"}>verifies</Link> — no writes</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
