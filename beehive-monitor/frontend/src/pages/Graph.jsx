import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api.js";
import { useRole } from "../context/RoleContext.jsx";
import LedgerGraph from "./LedgerGraph.jsx";
import { STAGE_SHORT as STAGE_LABEL, STAGE_ICON } from "../stages.js";
import "./Graph.css";

export default function Graph() {
  const { user, role } = useRole();
  const navigate = useNavigate();
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState("all");
  const [scopeInfo, setScopeInfo] = useState(null);
  const [stageFilter, setStageFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [searchMsg, setSearchMsg] = useState("");

  async function load(nextScope) {
    const s = nextScope || scope;
    setLoading(true);
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
    } catch {
      setBlocks([]);
      setScopeInfo(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const s = user ? "mine" : "all";
    setScope(s);
    load(s);
    setSelected(null);
    setStageFilter("all");
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const stagesPresent = useMemo(
    () => Object.keys(STAGE_LABEL).filter((s) => blocks.some((b) => b.stage === s)),
    [blocks]
  );

  const dimStages = useMemo(
    () => (stageFilter === "all" ? null : new Set([stageFilter])),
    [stageFilter]
  );

  const selectedBlock = useMemo(
    () => blocks.find((b) => b.hash === selected) || null,
    [blocks, selected]
  );

  function pickBlock(b) {
    setSelected(b.hash);
  }

  function searchHash(e) {
    e?.preventDefault();
    setSearchMsg("");
    const q = query.trim().toLowerCase();
    if (!q) return;
    const hit = blocks.find((b) => b.hash.toLowerCase().startsWith(q))
      || blocks.find((b) => b.hash.toLowerCase().includes(q));
    if (!hit) {
      setSearchMsg("No block in this view starts with that hash.");
      return;
    }
    setSelected(hit.hash);
    requestAnimationFrame(() => {
      const el = document.querySelector(`.graph-node[data-hash="${hit.hash}"]`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    });
  }

  if (loading) return <div className="page-container">Loading graph…</div>;

  return (
    <div className="page-container graph-page">
      <div className="pagehead">
        <div>
          <h1>Chain graph</h1>
          <p>Every block a node, every handoff an edge — converging lines are collective pools.</p>
        </div>
      </div>

      <div className="card graph-controls">
        <div className="graph-controls-row">
          {user && (
            <div className="ledger-filters">
              <button className={`filter-btn ${scope === "mine" ? "active" : ""}`} onClick={() => { setScope("mine"); load("mine"); }}>
                {role === "beekeeper" ? "My honey" : "My lots"}
              </button>
              <button className={`filter-btn ${scope === "all" ? "active" : ""}`} onClick={() => { setScope("all"); load("all"); }}>
                Full chain
              </button>
            </div>
          )}
          <form className="graph-search" onSubmit={searchHash}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find node by hash…"
              className="graph-search-input"
              spellCheck={false}
            />
            <button className="btn btn-outline" type="submit">Find</button>
          </form>
        </div>
        <div className="ledger-filters graph-stage-filters">
          <button className={`filter-btn ${stageFilter === "all" ? "active" : ""}`} onClick={() => setStageFilter("all")}>
            All stages
          </button>
          {stagesPresent.map((s) => (
            <button key={s} className={`filter-btn ${stageFilter === s ? "active" : ""}`} onClick={() => setStageFilter(s)}>
              {STAGE_LABEL[s]}
            </button>
          ))}
        </div>
        {searchMsg && <div className="form-msg error" style={{ marginTop: 8 }}>{searchMsg}</div>}
        {scope === "mine" && scopeInfo && (
          <div className="scope-note" style={{ marginTop: 8 }}>
            {scopeInfo.type === "beekeeper"
              ? `Tied to ${scopeInfo.beekeeper?.name || "your profile"} — your blocks plus every hop downstream.`
              : `Lots you minted${scopeInfo.centre ? ` · ${scopeInfo.centre.name}` : ""} — plus where they travelled.`}
          </div>
        )}
      </div>

      <LedgerGraph
        blocks={blocks}
        selected={selected}
        onSelect={pickBlock}
        dimStages={dimStages}
        title={scope === "mine" && user ? "Personal graph" : "The living chain"}
      />

      {selectedBlock ? (
        <div className="card graph-detail">
          <div className="graph-detail-head">
            <span className="graph-detail-icon" aria-hidden>
              {STAGE_ICON[selectedBlock.stage] || "⬡"}
            </span>
            <div>
              <div className="graph-detail-title">{STAGE_LABEL[selectedBlock.stage] || selectedBlock.stage}</div>
              <div className="graph-detail-sub">
                {new Date(selectedBlock.createdAt).toLocaleString()}
                {selectedBlock.is_frozen ? " · 🔒 frozen at retail" : ""}
                {selectedBlock.createdBy?.name ? ` · ✎ ${selectedBlock.createdBy.name}` : ""}
              </div>
            </div>
            {selectedBlock.is_frozen
              ? <span className="status-pill status-critical">Frozen</span>
              : <span className="status-pill status-healthy">On-chain</span>}
          </div>
          <div className="hash-row">
            <span className="hash-label">Hash</span>
            <span className="hash-val">{selectedBlock.hash}</span>
          </div>
          {selectedBlock.collective_name && (
            <div className="dashboard-sub">Collective: <strong>{selectedBlock.collective_name}</strong></div>
          )}
          <div className="graph-detail-actions">
            <button
              className="btn btn-primary"
              onClick={() => navigate(selectedBlock.scan_secret
                ? `/verify/${selectedBlock.hash}?s=${encodeURIComponent(selectedBlock.scan_secret)}`
                : `/verify/${selectedBlock.hash}`)}
            >
              Verify this block →
            </button>
            <Link className="btn btn-outline" to="/ledger">Back to ledger</Link>
          </div>
        </div>
      ) : (
        <p className="dashboard-sub" style={{ textAlign: "center" }}>Click any node — or find it by hash — to inspect and verify it.</p>
      )}
    </div>
  );
}
