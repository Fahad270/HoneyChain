import { useMemo } from "react";

// True honeycomb: flat-top hex tiling computed from the hive array.
// Any hive count tiles edge-to-edge — no hardcoded rows.
const SQ3 = Math.sqrt(3);

function hexPts(cx, cy, R) {
  const p = [];
  for (let k = 0; k < 6; k++) {
    const a = (Math.PI / 3) * k;
    p.push(`${(cx + R * Math.cos(a)).toFixed(1)},${(cy + R * Math.sin(a)).toFixed(1)}`);
  }
  return p.join(" ");
}

export default function HiveComb({ hives = [], selectedId = null, onSelect = null, radius = 56, rows = 5 }) {
  const cells = useMemo(() => {
    const dx = 1.5 * radius;
    const dy = SQ3 * radius;
    return hives.map((h, i) => {
      const col = Math.floor(i / rows);
      const row = i % rows;
      return {
        hive: h,
        cx: radius + dx * col,
        cy: radius + dy * row + (col % 2 ? dy / 2 : 0),
      };
    });
  }, [hives, radius, rows]);

  const bounds = useMemo(() => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    cells.forEach(({ cx, cy }) => {
      minX = Math.min(minX, cx - radius - 7);
      maxX = Math.max(maxX, cx + radius + 7);
      minY = Math.min(minY, cy - radius - 7);
      maxY = Math.max(maxY, cy + radius + 7);
    });
    if (!cells.length) return { x: 0, y: 0, w: 10, h: 10 };
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }, [cells, radius]);

  if (!hives.length) return <p className="empty">No hives yet.</p>;

  return (
    <svg
      className="comb-svg"
      viewBox={`${bounds.x} ${bounds.y} ${bounds.w} ${bounds.h}`}
      role="img"
      aria-label="Hive honeycomb"
    >
      {cells.map(({ hive: h, cx, cy }) => {
        const status = h.status === "warning" || h.status === "warn" ? "warn"
          : h.status === "critical" || h.status === "bad" ? "bad" : "ok";
        const sel = h.id === selectedId;
        return (
          <g
            key={h.id}
            onClick={() => onSelect && onSelect(h.id)}
            style={{ cursor: onSelect ? "pointer" : "default" }}
          >
            {sel && <polygon points={hexPts(cx, cy, radius + 6)} fill="var(--color-ink)" />}
            <polygon
              points={hexPts(cx, cy, radius)}
              fill={sel ? "var(--color-primary)" : status === "warn" ? "var(--comb-warn)" : status === "bad" ? "#e0a58c" : "var(--comb-healthy)"}
              stroke="var(--color-bg)"
              strokeWidth={3}
            />
            <text x={cx} y={cy - 4} textAnchor="middle" fontSize={12} fontWeight={700} fill={sel ? "var(--color-accent)" : "var(--color-ink)"}>
              #{typeof h.id === "number" ? h.id + 1 : h.id}
            </text>
            <text x={cx} y={cy + 15} textAnchor="middle" fontSize={14} fontWeight={800} fill={sel ? "#fff" : "var(--color-ink)"}>
              {h.temp}°
            </text>
          </g>
        );
      })}
    </svg>
  );
}
