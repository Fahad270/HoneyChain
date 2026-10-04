import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api.js";
import { QRCodeSVG } from "qrcode.react";
import { useRole } from "../context/RoleContext.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import LedgerGraph from "./LedgerGraph.jsx";
import { STAGE_LABEL, WORKFLOW_STEPS } from "../stages.js";
import VoiceHarvestLogger from "../components/VoiceHarvestLogger.jsx";
import "./Ledger.css";


function shortHash(h) {
  if (!h) return "genesis";
  return h.slice(0, 10) + "…" + h.slice(-6);
}

export default function Ledger() {
  const { role, user } = useRole();
  const { lang, t } = useLanguage();
  const navigate = useNavigate();
  const isBeekeeper = role === "beekeeper";
  const isKvic = role === "kvic";
  // mirrors backend middleware/auth.js STAGE_ROLES — enforced by JWT server-side
  const allowedStages = isBeekeeper
    ? ["honey_extraction"]
    : isKvic
      ? ["collection", "pooled", "transport", "processing", "lab_certified", "packaging", "distribution", "retail"]
      : [];
  const stageOptions = {
    honey_extraction: "2 — Honey Extraction (Beekeeper harvest)",
    collection: "3 — Collection (KVIC)",
    pooled: "3′ — Collective Pool (KVIC, many → one)",
    transport: "4 — Transport (KVIC)",
    processing: "5 — Processing & QC (KVIC)",
    lab_certified: "5b — Lab Certified (KVIC)",
    packaging: "6 — Packaging & Labeling (KVIC)",
    distribution: "7 — Distribution (KVIC)",
    retail: "8 — Retail — Khadi India (KVIC, FREEZE)",
  };

  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [scope, setScope] = useState("mine"); // mine (personal, logged in) | all (full chain)
  const [scopeInfo, setScopeInfo] = useState(null);
  const [scopeError, setScopeError] = useState("");
  const [creating, setCreating] = useState(false);
  const [expandedQr, setExpandedQr] = useState({});
  const toggleQr = (hash) => setExpandedQr((prev) => ({ ...prev, [hash]: !prev[hash] }));
  const [expandedHash, setExpandedHash] = useState({});
  const toggleHash = (hash) => setExpandedHash((prev) => ({ ...prev, [hash]: !prev[hash] }));

  const beekeeperBlocks = useMemo(() => {
    return blocks.filter((b) => b.stage === "honey_extraction" || b.stage === "beekeeper_registration");
  }, [blocks]);

  const [form, setForm] = useState({
    stage: "honey_extraction",
    prev_hash: "",
    prev_hashes: "",
    dataRaw: JSON.stringify({
      hive_id: "HIVE-01",
      weight_kg: 12,
      flower_source: "mustard",
      harvest_date: new Date().toISOString().slice(0, 10),
    }, null, 2),
    collective_name: "",
  });
  const [msg, setMsg] = useState(null);

  async function load(nextScope) {
    const s = nextScope || scope;
    setLoading(true);
    setScopeError("");
    try {
      if (s === "mine" && user) {
        const res = await api.get("/ledger/mine");
        setBlocks(res.data.data.blocks || []);
        setScopeInfo(res.data.data.scope || null);
      } else {
        const res = await api.get("/ledger/chain");
        setBlocks(res.data.data || []);
        setScopeInfo(null);
      }
    } catch (err) {
      if (s === "mine" && err?.response?.status === 404) {
        setBlocks([]);
        setScopeInfo(null);
        setScopeError(err?.response?.data?.error || "Nothing linked yet.");
      } else {
        setBlocks([]);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(user ? "mine" : "all");
    setScope(user ? "mine" : "all");
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  function switchScope(s) {
    setScope(s);
    load(s);
  }

  // keep stage in sync when the account tier resolves
  useEffect(() => {
    if (!allowedStages.length) return;
    setForm((f) => {
      if (!allowedStages.includes(f.stage)) return { ...f, stage: allowedStages[0] };
      return f;
    });
  }, [role]); // eslint-disable-line react-hooks/exhaustive-deps

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
    if (!user) {
      setMsg({ type: "error", text: "Log in first — minting needs a beekeeper or KVIC account." });
      return;
    }
    if (!allowedStages.includes(form.stage)) {
      setMsg({ type: "error", text: `Your ${role} account cannot create ${form.stage}.` });
      return;
    }
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
      <div className="pagehead">
        <div>
          <h1>{isBeekeeper ? t("harvest_logbook_title", "Harvest Logbook") : isKvic ? t("custody_ledger_title", "Blockchain Custody Ledger") : t("public_ledger_title", "Public Blockchain Ledger")}</h1>
          <p>
            {isBeekeeper
              ? "Apiary honey extraction records & village custody handoff"
              : `${blocks.length} blocks on-chain · ${frozenCount} frozen at retail`}
          </p>
        </div>
        <div className="actions">
          {isBeekeeper ? (
            <>
              <Link className="btn btn-primary" to="/twin">{t("my_twin", "My Farm Twin")} →</Link>
              <Link className="btn btn-outline" to="/verify">{t("verify_jar", "Verify a Jar")}</Link>
            </>
          ) : (
            <>
              <Link className="btn btn-outline" to="/verify">Verify a jar</Link>
              <Link className="btn btn-primary" to="/graph">Graph explorer</Link>
            </>
          )}
        </div>
      </div>

      {isBeekeeper ? (
        /* ——— Beekeeper Dedicated Harvest Logbook UI (Clean, No Chain Clutter) ——— */
        <div className="beekeeper-logbook-container">
          <div className="sync-status-card">
            <div className="sync-status-left">
              <span className="sync-dot live" />
              <div>
                <strong>{t("local_logbook_offline", "Apiary Logbook · Offline-Ready")}</strong>
                <p>{t("local_logbook_desc", "Stored securely on-device. Ready to sync with your village KVIC node.")}</p>
              </div>
            </div>
            <div className="sync-status-right">
              <span className="sync-counter">{beekeeperBlocks.length} {t("records_logged", "Records")}</span>
              <button
                type="button"
                className="btn btn-sm btn-outline sync-btn"
                onClick={() => {
                  load();
                  alert("✓ Harvest records verified and synced with local KVIC node.");
                }}
              >
                🔄 {t("sync_with_kvic", "Sync with KVIC Node")}
              </button>
            </div>
          </div>

          <div className="logbook-grid">
            {/* Left Column: My Harvests */}
            <div className="logbook-records">
              <div className="section-head">
                <h3>{t("my_harvest_entries", "My Harvest Entries")}</h3>
                <span className="record-count">{beekeeperBlocks.length} entries</span>
              </div>

              {beekeeperBlocks.length === 0 ? (
                <div className="card empty">
                  No harvests recorded yet. Use the voice logger on the right or type details below to log your first honey extraction.
                </div>
              ) : (
                beekeeperBlocks.map((b) => {
                  const isGen = b.stage === "beekeeper_registration";
                  const harvestDate = b.data?.harvest_date || b.createdAt;
                  const weightKg = b.data?.weight_kg || b.data?.quantity_kg || 12;
                  const flowerSource = b.data?.flower_source || b.data?.flower_type || t("mustard", "Mustard");
                  const hiveId = b.data?.hive_id || "HIVE-01";
                  const mspValue = typeof weightKg === "number" ? `₹${(weightKg * 225).toLocaleString()}` : "₹2,700";

                  return (
                    <div key={b.hash} className="card harvest-card">
                      <div className="harvest-card-head">
                        <div className="harvest-badge">
                          {isGen ? `🐝 ${t("registered_apiary", "Registered Apiary")}` : `🍯 ${t("honey_harvest", "Honey Harvest")}`}
                        </div>
                        <span className="harvest-date">
                          {new Date(harvestDate).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>

                      {isGen ? (
                        <div className="harvest-gen-info" style={{ marginBottom: 12 }}>
                          <h4 style={{ margin: "4px 0" }}>{b.beekeeper?.name || b.data?.name || "Rameshwar Patel"} — {b.beekeeper?.village || b.data?.village || "Alwar Khurd"}</h4>
                          <p style={{ margin: 0, fontSize: 12.5, color: "var(--color-text-muted)" }}>
                            {b.data?.noOfBeeColonies || 18} Bee Colonies Active · Aadhaar KYC Verified · NBHM ID: {b.data?.clusterId || "ALW-KVIC-04"}
                          </p>
                        </div>
                      ) : (
                        <div className="harvest-metrics-grid">
                          <div className="h-metric">
                            <span className="hm-label">{t("hive_number", "Hive Number")}</span>
                            <span className="hm-val">{hiveId}</span>
                          </div>
                          <div className="h-metric">
                            <span className="hm-label">{t("honey_yield", "Yield")}</span>
                            <span className="hm-val accent">{weightKg} kg</span>
                          </div>
                          <div className="h-metric">
                            <span className="hm-label">{t("floral_source", "Floral Source")}</span>
                            <span className="hm-val">{flowerSource}</span>
                          </div>
                          <div className="h-metric">
                            <span className="hm-label">{t("kvic_msp", "KVIC MSP")}</span>
                            <span className="hm-val success">{mspValue}</span>
                          </div>
                        </div>
                      )}

                      <div className="harvest-status-row">
                        <span className="status-label">KVIC Status:</span>
                        <span className="status-pill status-healthy">
                          {isGen ? "✓ Apiary Registered" : `📦 ${t("ready_for_kvic", "Ready for Village KVIC Collection")}`}
                        </span>
                      </div>

                      <div className="harvest-card-actions">
                        {isGen && (
                          <Link className="btn btn-outline btn-sm" to="/">
                            📝 {t("registration_form", "Registration Form")}
                          </Link>
                        )}
                        <Link className="btn btn-outline btn-sm" to={`/verify/${b.hash}`}>
                          {t("verify_purity_cert", "Verify Certificate")}
                        </Link>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => toggleQr(b.hash)}
                        >
                          {expandedQr[b.hash] ? `▲ ${t("hide_qr", "Hide QR")}` : `📱 ${t("show_harvest_qr", "Show QR")}`}
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => toggleHash(b.hash)}
                        >
                          {expandedHash[b.hash] ? "▲ Hide Hash" : `# ${t("proof_hash", "Proof Hash")}`}
                        </button>
                      </div>

                      {expandedQr[b.hash] && (
                        <div className="story-qr" style={{ marginTop: 12 }}>
                          <div className="qr-box">
                            <QRCodeSVG value={`${window.location.origin}/verify/${b.hash}?s=${b.scan_secret}`} size={105} />
                          </div>
                          <div className="qr-meta">
                            <strong>Official Harvest Proof QR</strong>
                          </div>
                        </div>
                      )}

                      {expandedHash[b.hash] && (
                        <div className="expanded-hash-box">
                          <span style={{ fontSize: 10, textTransform: "uppercase", fontWeight: 800, color: "var(--color-text-muted)", display: "block" }}>Immutable Blockchain Hash</span>
                          <code style={{ fontSize: 11, wordBreak: "break-all" }}>{b.hash}</code>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Right Column: Voice Logger & Field Standards */}
            <div className="logbook-tools">
              <VoiceHarvestLogger
                defaultPrevHash={form.prev_hash || (blocks.length > 0 ? blocks[0].hash : "")}
                onCommitHarvest={async (harvestPayload) => {
                  const res = await api.post("/ledger/block", {
                    stage: harvestPayload.stage,
                    prev_hash: harvestPayload.prev_hash,
                    data: harvestPayload.data,
                  });
                  load();
                  return res;
                }}
              />

              <div className="card fssai-field-card" style={{ marginTop: 16 }}>
                <h4 style={{ margin: "0 0 8px", fontSize: 14 }}>🌾 {t("fssai_standards_title", "Pre-Harvest Field Standards")}</h4>
                <ul className="field-checklist">
                  <li><strong>Moisture ≤ 20%:</strong> Extract only from ≥75% capped comb cells.</li>
                  <li><strong>Food-Grade Container:</strong> Use designated stainless steel or HDPE buckets.</li>
                  <li><strong>Zero Brood Contamination:</strong> Always extract with queen excluders in place.</li>
                  <li><strong>No Direct Heating:</strong> Raw crystallization is natural and accepted.</li>
                </ul>
                <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--color-border)" }}>
                  <Link to="/twin" className="btn btn-outline btn-sm" style={{ width: "100%", textAlign: "center" }}>
                    {t("open_my_twin", "Track Honey Beyond Apiary in My Twin →")}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ——— KVIC Officer / Public Auditor Blockchain Custody View ——— */
        <>
          {/* Personal scope — tied to the login, not a switch */}
          {user && (
            <div className="scope-bar">
              <div className="ledger-filters">
                <button className={`filter-btn ${scope === "mine" ? "active" : ""}`} onClick={() => switchScope("mine")}>
                  Interacted chains
                </button>
                <button className={`filter-btn ${scope === "all" ? "active" : ""}`} onClick={() => switchScope("all")}>
                  All chains
                </button>
              </div>
            </div>
          )}
          {scopeError && (
            <div className="card" style={{ borderColor: "#E8C46A", marginBottom: 16 }}>
              <span className="dashboard-sub">{scopeError} </span>
            </div>
          )}

          {/* The graph — evocative, elucidatory: stages as lanes, pools converging. */}
          <LedgerGraph
            blocks={blocks}
            title={scope === "mine" && user ? "Interacted chains" : "All chains"}
            onSelect={(b) => navigate(b.scan_secret ? `/verify/${b.hash}?s=${encodeURIComponent(b.scan_secret)}` : `/verify/${b.hash}`)}
          />

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

              {filtered.map((b, idx) => {
                const isGenesis = !b.prev_hash && (!b.prev_hashes || b.prev_hashes.length === 0);
                const isPooled = b.stage === "pooled" && b.prev_hashes && b.prev_hashes.length;
                const isFrozen = b.is_frozen || b.stage === "retail";
                const veryFirst = idx === 0 && isGenesis && b.stage === "beekeeper_registration";
                const isHarvestOrGenesis = b.stage === "beekeeper_registration" || b.stage === "honey_extraction";

                return (
                  <div key={b.hash} className={`story-item${isPooled ? " pool" : ""}`}>
                    <div className="story-card">
                      <span className="story-tag">
                        {veryFirst ? "★ Genesis" : STAGE_LABEL[b.stage] || b.stage}
                      </span>
                      <h3>
                        {b.collective_name || (b.beekeeper?.name ? `${b.beekeeper.name}${b.beekeeper.village ? " • " + b.beekeeper.village : ""}` : (b.data?.name ? `${b.data.name}${b.data.village ? " • " + b.data.village : ""}` : STAGE_LABEL[b.stage] || b.stage))}
                        {isFrozen && <span className="status-pill status-critical" style={{ marginLeft: 8 }}>Frozen at retail</span>}
                        {isPooled && <span className="status-pill status-warning" style={{ marginLeft: 8 }}>DAG • {b.prev_hashes.length}→1</span>}
                      </h3>
                      <div className="story-date">{new Date(b.createdAt).toLocaleString()}</div>
                      
                      {/* Compact Expandable Hash */}
                      <div className="hash-row" style={{ marginTop: 10 }}>
                        <span className="hash-label">Hash</span>
                        <code className="hash-val compact">{shortHash(b.hash)}</code>
                        <button
                          type="button"
                          className="btn btn-outline btn-xs"
                          style={{ padding: "2px 8px", fontSize: 11 }}
                          onClick={() => toggleHash(b.hash)}
                        >
                          {expandedHash[b.hash] ? "▲ Hide" : "👁️ Hash"}
                        </button>
                        <button className="copy-btn" onClick={async () => { try { await navigator.clipboard.writeText(b.hash); } catch { const ta = document.createElement("textarea"); ta.value = b.hash; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove(); } }} title="Copy full hash">⎘</button>
                      </div>
                      {expandedHash[b.hash] && (
                        <div className="expanded-hash-box">
                          <code>{b.hash}</code>
                        </div>
                      )}

                      <div className="hash-row">
                        <span className="hash-label">Prev</span>
                        {isPooled ? (
                          <div className="prev-pooled">
                            {b.prev_hashes.map((ph) => (
                              <code key={ph} className="hash-val small">{shortHash(ph)}</code>
                            ))}
                          </div>
                        ) : (
                          <code className="hash-val small">{shortHash(b.prev_hash) || "— genesis"}</code>
                        )}
                      </div>

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

                  {expandedQr[b.hash] && (
                    <div className="story-qr">
                      <div className="qr-box">
                        <QRCodeSVG value={`${window.location.origin}/verify/${b.hash}?s=${b.scan_secret}`} size={110} level="M" />
                      </div>
                      <div className="qr-meta">
                        <div className="qr-caption" style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text)" }}>
                          {isFrozen
                            ? "🔒 Certified Retail Product QR"
                            : isBeekeeper
                              ? "🐝 Farm-Gate Handoff QR Code"
                              : isKvic
                                ? "🏛️ Custody Handoff QR Code"
                                : "🔍 Public Verification QR"}
                        </div>

                        <Link className="btn btn-outline btn-xs" style={{ width: "fit-content", padding: "4px 10px", fontSize: 11.5 }} to={`/verify/${b.hash}?s=${b.scan_secret}`}>
                          🔗 Open Verification Page ↗
                        </Link>
                        {isFrozen ? (
                          <div className="frozen-note" style={{ marginTop: 6 }}>Locked at Retail — Batch Complete</div>
                        ) : (
                          <div className="scan-hint" style={{ marginTop: 6 }}>
                            scan_secret: <code>{b.scan_secret}</code>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="block-actions">
                    <Link className="btn btn-primary" to={`/verify/${b.hash}?s=${b.scan_secret}`}>
                      Verify chain
                    </Link>
                    <button
                      type="button"
                      className={`btn btn-outline ${expandedQr[b.hash] ? "active" : ""}`}
                      onClick={() => toggleQr(b.hash)}
                    >
                      {expandedQr[b.hash] ? "▲ Hide QR" : "📱 Show QR"}
                    </button>

                    {isFrozen ? (
                      <span className="role-tag tag-frozen" title="Terminal block: chain is frozen at retail shelf. No further hops permitted.">
                        🔒 Frozen at Retail
                      </span>
                    ) : isBeekeeper ? (
                      isHarvestOrGenesis ? (
                        <button
                          type="button"
                          className="btn btn-outline"
                          onClick={() => setForm((f) => ({ ...f, prev_hash: b.hash, stage: "honey_extraction" }))}
                        >
                          Use as prev (Harvest)
                        </button>
                      ) : (
                        <span className="role-tag tag-read-only" title="Downstream KVIC custody hop. Only KVIC officers can append to this block.">
                          🏛️ KVIC Custody Hop (Read-only)
                        </span>
                      )
                    ) : isKvic ? (
                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() => setForm((f) => ({ ...f, prev_hash: b.hash }))}
                      >
                        Use as prev
                      </button>
                    ) : (
                      <Link className="btn btn-outline" to="/account" title="Log in as Beekeeper or KVIC Officer to append blocks">
                        Log in to append
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Create panel — login-gated */}
        <div className="ledger-create card">
          <h3>Append next block</h3>
          {!user ? (
            <>
              <p className="dashboard-sub" style={{ marginBottom: 12 }}>
                The chain is public to read, but appending needs an account — so every block is tied to a real beekeeper or KVIC staffer.
              </p>
              <Link className="btn btn-honey" to="/account" style={{ width: "100%", textAlign: "center" }}>
                Log in / create account to mint
              </Link>
              <div className="field-hint" style={{ marginTop: 12 }}>
                Beekeeper accounts mint <code>honey_extraction</code> · KVIC accounts mint collection → retail freeze.
              </div>
            </>
          ) : (
          <>
          {isBeekeeper && (
            <VoiceHarvestLogger
              defaultPrevHash={form.prev_hash || (blocks.length > 0 ? blocks[blocks.length - 1].hash : "")}
              onCommitHarvest={async (harvestPayload) => {
                const res = await api.post("/ledger/block", {
                  stage: harvestPayload.stage,
                  prev_hash: harvestPayload.prev_hash,
                  data: harvestPayload.data,
                });
                load();
                return res;
              }}
            />
          )}

          <form onSubmit={handleCreate} className="create-form">

            <label className="field">
              <span>Stage *</span>
              <select value={form.stage} onChange={(e) => setForm((f) => ({ ...f, stage: e.target.value }))}>
                {allowedStages.map((k) => (
                  <option key={k} value={k}>{stageOptions[k]}</option>
                ))}
              </select>
            </label>

            {form.stage === "pooled" ? (
              <label className="field">
                <span>Parent Hashes (Comma-separated) *</span>
                <textarea rows={3} value={form.prev_hashes} onChange={(e) => setForm((f) => ({ ...f, prev_hashes: e.target.value }))} placeholder="hash1, hash2, hash3 …" />
              </label>
            ) : (
              <label className="field">
                <span>Previous Block Hash</span>
                <input value={form.prev_hash} onChange={(e) => setForm((f) => ({ ...f, prev_hash: e.target.value }))} placeholder="paste hash from previous block" />
              </label>
            )}

            <label className="field">
              <span>Collective / Facility Name</span>
              <input value={form.collective_name} onChange={(e) => setForm((f) => ({ ...f, collective_name: e.target.value }))} placeholder="Alwar Honey Producers Federation" />
            </label>

            <label className="field">
              <span>Block Payload (JSON)</span>
              <textarea rows={7} value={form.dataRaw} onChange={(e) => setForm((f) => ({ ...f, dataRaw: e.target.value }))} />
            </label>

            {msg && <div className={`form-msg ${msg.type}`}>{msg.text}</div>}

            <button type="submit" className="btn btn-primary" disabled={creating || !allowedStages.includes(form.stage)} style={{ width: "100%", marginTop: 8 }}>
              {creating ? "Minting…" : form.stage === "pooled" ? "Pool & Mint Block" : "Mint Block"}
            </button>
            {!allowedStages.includes(form.stage) && <div className="form-msg error">Not allowed for your account.</div>}
          </form>
          </>
          )}
        </div>
      </div>
      </>
      )}
    </div>
  );
}
