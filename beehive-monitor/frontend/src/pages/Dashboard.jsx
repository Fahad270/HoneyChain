import { useEffect, useMemo, useState } from "react";
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";
import api from "../api.js";
import "./Dashboard.css";

const STATUS_LABEL = { healthy: "Healthy", warning: "Attention", critical: "Critical" };

export default function Dashboard() {
  const [hives, setHives] = useState([]);
  const [weather, setWeather] = useState(null);
  const [selectedId, setSelectedId] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get("/hives"), api.get("/hives/weather")])
      .then(([hivesRes, weatherRes]) => {
        setHives(hivesRes.data.data);
        setWeather(weatherRes.data.data);
      })
      .catch(() => {
        // Backend not reachable — page still renders, just empty.
      })
      .finally(() => setLoading(false));
  }, []);

  const selected = hives.find((h) => h.id === selectedId);

  const counts = useMemo(() => {
    const c = { healthy: 0, warning: 0, critical: 0 };
    hives.forEach((h) => { if (c[h.status] !== undefined) c[h.status]++; });
    return c;
  }, [hives]);

  const alerts = useMemo(
    () =>
      hives
        .filter((h) => h.status !== "healthy")
        .flatMap((h) => (Array.isArray(h.flags) ? h.flags : []).map((f) => ({ hive: h, text: f })))
        .sort((a) => (a.hive.status === "critical" ? -1 : 1)),
    [hives]
  );

  const rows = [];
  for (let i = 0; i < hives.length; i += 5) rows.push(hives.slice(i, i + 5));

  if (loading) return <div className="page-container">Loading hive data…</div>;

  return (
    <div className="page-container">
      <div className="dashboard-topbar">
        <div>
          <div className="kicker">Live apiary · Mock telemetry</div>
          <h1>Apiary Overview</h1>
          <p className="dashboard-sub">{hives.length} hives · ideal brood temperature is 35°C · tap a comb to inspect</p>
        </div>
        <div className="stat-row">
          <Stat label="Healthy" value={counts.healthy} color="var(--color-success)" />
          <Stat label="Attention" value={counts.warning} color="var(--color-warning)" />
          <Stat label="Critical" value={counts.critical} color="var(--color-danger)" />
        </div>
      </div>

      <div className="dashboard-layout">
        <div className="dashboard-left">
          <div className="card">
            <h3>Weather &amp; India climate context</h3>
            {weather && (
              <div className="weather-row">
                <div className="weather-temp">{weather.tempC}°C</div>
                <div className="weather-meta">
                  <div>Humidity {weather.humidity}%</div>
                  <div>Wind {weather.wind} km/h</div>
                  <div>Pressure {weather.pressure} hPa</div>
                </div>
              </div>
            )}
            {weather && <p className="weather-note">{weather.note}</p>}
            <div className="climate-facts">
              <ClimateFact
                title="Monsoon"
                text="Foragers stay grounded in rain — expect flat or dipping weight, not necessarily a problem."
              />
              <ClimateFact
                title="Peak summer"
                text="Above ~38°C the colony spends energy cooling instead of foraging — watch brood temp closely."
              />
              <ClimateFact
                title="False winter warmth"
                text="A warm spell mid-winter can trigger early brood rearing before forage is available — a common regional risk."
              />
            </div>
          </div>

          <div className="card">
            <h3>Hives — tap to inspect</h3>
            <div className="hex-wrap">
              {rows.map((row, ri) => (
                <div className={"hex-row" + (ri % 2 === 1 ? " odd" : "")} key={ri}>
                  {row.map((h) => (
                    <button
                      key={h.id}
                      className={`hex hex-${h.status}` + (h.id === selectedId ? " active" : "")}
                      onClick={() => setSelectedId(h.id)}
                      title={h.name}
                    >
                      <span className="hex-n">#{h.id + 1}</span>
                      <span className="hex-v">{h.temp}°</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
            <div className="legend">
              <LegendItem color="var(--color-success)" label="Healthy" />
              <LegendItem color="var(--color-warning)" label="Attention" />
              <LegendItem color="var(--color-danger)" label="Critical" />
            </div>
          </div>

          <div className="card">
            <h3>Active alerts ({alerts.length})</h3>
            {alerts.length === 0 && <p className="empty">No active alerts.</p>}
            {alerts.map((a, i) => (
              <div className="alert-row" key={i} onClick={() => setSelectedId(a.hive.id)}>
                <span className={`status-pill status-${a.hive.status}`}>{STATUS_LABEL[a.hive.status]}</span>
                <div>
                  <div className="alert-hive">{a.hive.name}</div>
                  <div className="alert-text">{a.text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {selected && (
          <div className="card dashboard-detail">
            <div className="detail-head">
              <div>
                <h3>{selected.name}</h3>
                <div className="detail-sub">Hive #{selected.id + 1}</div>
              </div>
              <span className={`status-pill status-${selected.status}`}>{STATUS_LABEL[selected.status]}</span>
            </div>

            <div className="metric-grid">
              <Metric label="Brood temp" value={`${selected.temp}°C`} />
              <Metric label="Humidity" value={`${selected.hum}%`} />
              <Metric label="Weight" value={`${selected.weight}kg`} sub={`${selected.weightDelta >= 0 ? "+" : ""}${selected.weightDelta}kg/24h`} />
              <Metric label="Battery" value={`${selected.battery}%`} />
            </div>

            <div className="chart-label">24h brood temp &amp; humidity</div>
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={selected.tempHistory} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#E1DFD3" vertical={false} />
                <XAxis dataKey="t" tick={{ fontSize: 10 }} interval={3} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={42} domain={["dataMin - 1", "dataMax + 1"]} />
                <Tooltip />
                <Line type="monotone" dataKey="temp" stroke="#E3A23D" strokeWidth={2} dot={false} name="Temp °C" />
                <Line type="monotone" dataKey="hum" stroke="#1F5D50" strokeWidth={2} dot={false} name="Humidity %" />
              </LineChart>
            </ResponsiveContainer>

            <div className="chart-label">7-day weight (kg)</div>
            <ResponsiveContainer width="100%" height={120}>
              <AreaChart data={selected.weightHistory} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="wfill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2F8558" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#2F8558" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#E1DFD3" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={42} domain={["dataMin - 1", "dataMax + 1"]} />
                <Tooltip />
                <Area type="monotone" dataKey="weight" stroke="#2F8558" strokeWidth={2} fill="url(#wfill)" />
              </AreaChart>
            </ResponsiveContainer>

            <div className="chart-label">Notes</div>
            {(selected.flags || []).length === 0 ? (
              <p className="empty">All readings within normal range.</p>
            ) : (
              <ul className="flag-list">
                {(selected.flags || []).map((f, i) => <li key={i}>{f}</li>)}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div className="stat">
      <div className="stat-num" style={{ color }}>{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function LegendItem({ color, label }) {
  return (
    <div className="legend-item">
      <span className="legend-dot" style={{ background: color }} />
      {label}
    </div>
  );
}

function Metric({ label, value, sub }) {
  return (
    <div className="metric">
      <div className="metric-value">{value}</div>
      <div className="metric-label">{sub || label}</div>
    </div>
  );
}

function ClimateFact({ title, text }) {
  return (
    <div className="climate-fact">
      <div className="climate-fact-title">{title}</div>
      <div className="climate-fact-text">{text}</div>
    </div>
  );
}
