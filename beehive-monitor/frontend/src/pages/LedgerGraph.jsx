import { useMemo } from "react";
import { STAGE_ORDER, STAGE_SHORT, STAGE_ICON } from "../stages.js";
import "./LedgerGraph.css";

// DAG of the ledger: one lane-column per workflow stage, one node per
// block, bezier edges for every prev link (pooled lots visibly converge).
// Works on any block set: full chain (public) or a personal scope (mine).
// Order, labels and icons come from stages.js; only node colors live here.

// Node colors per stage (order/labels/icons shared via stages.js).
const STAGE_COLORS = {
  beekeeper_registration: { fill: "#E4EFE8", stroke: "#14503F", text: "#0C2E25" },
  honey_extraction: { fill: "#E9F6ED", stroke: "#1E7A4C", text: "#14532D" },
  collection: { fill: "#E7EEFB", stroke: "#2B4EA3", text: "#1E2F66" },
  pooled: { fill: "#FFF3D4", stroke: "#B87F22", text: "#5C3F06", dashed: true },
  transport: { fill: "#E7EEFB", stroke: "#2B4EA3", text: "#1E2F66" },
  processing: { fill: "#E7EEFB", stroke: "#2B4EA3", text: "#1E2F66" },
  lab_certified: { fill: "#EFE7FB", stroke: "#6D3BC7", text: "#3E2273" },
  packaging: { fill: "#E7EEFB", stroke: "#2B4EA3", text: "#1E2F66" },
  distribution: { fill: "#E7EEFB", stroke: "#2B4EA3", text: "#1E2F66" },
  retail: { fill: "#FBEAE8", stroke: "#C0453B", text: "#8A231C" },
};

function stageStyle(stage) {
  const c = STAGE_COLORS[stage] || { fill: "#fff", stroke: "#999", text: "#333" };
  return { ...c, icon: STAGE_ICON[stage] || "⬡", label: STAGE_SHORT[stage] || stage };
}

const NODE_W = 148;
const NODE_H = 64;
const GAP_X = 52;
const GAP_Y = 28;
const PAD_X = 16;
const PAD_TOP = 30;

function parentsOf(b) {
  if (b.prev_hashes && b.prev_hashes.length) return b.prev_hashes;
  if (b.prev_hash) return [b.prev_hash];
  return [];
}

export default function LedgerGraph({ blocks = [], selected = null, onSelect = null, title = "The living chain", dimStages = null }) {
  const layout = useMemo(() => {
    const colOf = (stage) => {
      const i = STAGE_ORDER.indexOf(stage);
      return i < 0 ? STAGE_ORDER.length - 1 : i;
    };
    const byHash = new Map(blocks.map((b) => [b.hash, b]));
    const sorted = [...blocks].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const used = new Map(); // col -> Set(lane)
    const nextLane = new Map();
    const pos = new Map(); // hash -> { x, y, lane, col }
    let maxLane = 0;
    for (const b of sorted) {
      const col = colOf(b.stage);
      if (!used.has(col)) { used.set(col, new Set()); nextLane.set(col, 0); }
      const lanes = used.get(col);
      const parentLanes = parentsOf(b).map((p) => pos.get(p)?.lane).filter((l) => l !== undefined);
      const pref = parentLanes.length ? Math.min(...parentLanes) : null;
      let lane;
      if (pref !== null && !lanes.has(pref)) lane = pref;
      else { lane = nextLane.get(col); nextLane.set(col, lane + 1); }
      lanes.add(lane);
      maxLane = Math.max(maxLane, lane);
      pos.set(b.hash, { x: PAD_X + col * (NODE_W + GAP_X), y: PAD_TOP + lane * (NODE_H + GAP_Y), lane, col });
    }
    const edges = [];
    for (const b of sorted) {
      const to = pos.get(b.hash);
      for (const p of parentsOf(b)) {
        const from = pos.get(p);
        if (from && to) edges.push({ from, to, child: b.hash });
      }
    }
    const width = PAD_X * 2 + STAGE_ORDER.length * NODE_W + (STAGE_ORDER.length - 1) * GAP_X;
    const height = PAD_TOP + 14 + (maxLane + 1) * (NODE_H + GAP_Y);
    return { pos, edges, width, height, byHash };
  }, [blocks]);

  if (!blocks.length) {
    return (
      <div className="card graph-card">
        <div className="graph-empty">
          <span className="graph-empty-icon">⬡</span>
          <p>No blocks in this view yet — the graph draws itself as the chain grows.</p>
        </div>
      </div>
    );
  }

  const edgePath = (a, b) => {
    const x1 = a.x + NODE_W;
    const y1 = a.y + NODE_H / 2;
    const x2 = b.x;
    const y2 = b.y + NODE_H / 2;
    const mx = (x1 + x2) / 2;
    return `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
  };

  return (
    <div className="card graph-card">
      <div className="graph-head">
        <div>
          <div className="graph-title">{title}</div>
          <div className="graph-sub">
            {blocks.length} block{blocks.length === 1 ? "" : "s"} · one column per stage, left (hive) to right (Khadi shelf) ·
            converging lines are collective pools · <span className="graph-frozen-key">red = frozen at retail</span>
          </div>
        </div>
        <div className="graph-legend">
          <span><i style={{ background: "#1E7A4C" }} />beekeeper</span>
          <span><i style={{ background: "#2B4EA3" }} />kvic chain</span>
          <span><i style={{ background: "#B87F22" }} />pooled</span>
          <span><i style={{ background: "#C0453B" }} />retail freeze</span>
        </div>
      </div>
      <div className="graph-scroll">
        <svg
          className="graph-svg"
          width={layout.width}
          height={layout.height}
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          role="img"
          aria-label="Ledger chain graph"
        >
          {STAGE_ORDER.map((s, i) => (
            <g key={s}>
              <line
                x1={PAD_X + i * (NODE_W + GAP_X) + NODE_W / 2}
                y1={8}
                x2={PAD_X + i * (NODE_W + GAP_X) + NODE_W / 2}
                y2={layout.height - 6}
                className="graph-lane"
              />
              <text
                x={PAD_X + i * (NODE_W + GAP_X) + NODE_W / 2}
                y={16}
                textAnchor="middle"
                className="graph-col-label"
              >
                {(STAGE_SHORT[s] || s).toUpperCase()}
              </text>
            </g>
          ))}
          {layout.edges.map((e, i) => (
            <path key={i} d={edgePath(e.from, e.to)} className="graph-edge" />
          ))}
          {blocks.map((b) => {
            const p = layout.pos.get(b.hash);
            const st = stageStyle(b.stage);
            const isSel = selected === b.hash;
            const dimmed = dimStages && !dimStages.has(b.stage);
            return (
              <g
                key={b.hash}
                data-hash={b.hash}
                transform={`translate(${p.x}, ${p.y})`}
                className={`graph-node ${isSel ? "selected" : ""} ${onSelect ? "clickable" : ""} ${dimmed ? "dimmed" : ""}`}
                onClick={() => onSelect && onSelect(b)}
              >
                <title>{`${st.label || b.stage} · ${b.hash.slice(0, 16)}… · ${new Date(b.createdAt).toLocaleString()}`}</title>
                <rect
                  width={NODE_W}
                  height={NODE_H}
                  rx={14}
                  fill={st.fill}
                  stroke={isSel ? "#0C2E25" : st.stroke}
                  strokeWidth={isSel ? 3 : b.is_frozen ? 2.5 : 1.5}
                  strokeDasharray={st.dashed ? "7 4" : b.is_frozen ? "" : ""}
                  className="graph-node-rect"
                />
                <text x={14} y={26} fontSize={19}>{st.icon}</text>
                <text x={40} y={24} className="graph-node-hash">{b.hash.slice(0, 10)}…</text>
                <text x={40} y={41} className="graph-node-meta">
                  {b.is_frozen ? "🔒 frozen" : new Date(b.createdAt).toLocaleDateString()}
                </text>
                {b.createdBy?.name && (
                  <text x={40} y={52} className="graph-node-meta graph-node-author">
                    ✎ {(b.createdBy.name || "").split(" ")[0]}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      <div className="graph-foot">Click any node to open its Khadi verification card.</div>
    </div>
  );
}
