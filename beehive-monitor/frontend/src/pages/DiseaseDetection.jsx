import { useState, useEffect } from "react";
import api from "../api.js";
import "./DiseaseDetection.css";

const SEASONS = ["spring", "summer", "monsoon", "autumn", "winter"];

export default function DiseaseDetection() {
  return (
    <div className="page-container">
      <div className="kicker">AI Lab · Vision + RAG Advisory + Standards</div>
      <h1 className="section-title">Disease Detection, Advisory <span className="amp">&</span> <em>Standards</em></h1>
      <p className="dashboard-sub">
        Offline-first advisory: quoted extension cards, deterministic FSSAI compliance verification, and crop yield trends.
      </p>
      <div className="diagnose-layout">
        <DiseasePanel />
        <ProductivityPanel />
      </div>
      <div className="diagnose-layout" style={{ marginTop: 24 }}>
        <AdvisoryPanel />
        <LabReportPanel />
      </div>
      <div style={{ marginTop: 24 }}>
        <ReferenceCardsPanel />
      </div>
    </div>
  );
}


function DiseasePanel() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState(null); // null | "loading" | "done" | "error"
  const [errorMsg, setErrorMsg] = useState("");

  function onFileChange(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
    setStatus(null);
  }

  async function submit() {
    if (!file) return;
    setStatus("loading");
    setErrorMsg("");
    try {
      const formData = new FormData();
      formData.append("image", file);
      // let the browser set multipart boundary — do not set Content-Type manually
      const res = await api.post("/disease/detect", formData);
      setResult(res.data.data);
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err?.response?.data?.error || "Could not reach the disease detection service.");
    }
  }

  return (
    <div className="card diagnose-panel">
      <h3>Disease Detection</h3>
      <p className="panel-note">
        Uses a vision AI model (Claude) rather than a custom-trained classifier — fast to stand up,
        works without a labeled training set.
      </p>

      <label className="upload-box">
        {preview ? (
          <img src={preview} alt="preview" className="upload-preview" />
        ) : (
          <span>Click to upload a hive / frame / bee photo</span>
        )}
        <input type="file" accept="image/*" onChange={onFileChange} hidden />
      </label>

      <button className="btn btn-primary" onClick={submit} disabled={!file || status === "loading"}>
        {status === "loading" ? "Analyzing…" : "Analyze photo"}
      </button>

      {status === "error" && <p className="form-msg error">{errorMsg}</p>}

      {result && (
        <div className="result-box">
          <div className="result-row">
            <span className="result-label">Likely condition</span>
            <span className="result-value">{result.likelyCondition}</span>
          </div>
          <div className="result-row">
            <span className="result-label">Confidence</span>
            <span className={`status-pill status-${confidenceClass(result.confidence)}`}>{result.confidence}</span>
          </div>
          <div className="result-row">
            <span className="result-label">Visual evidence</span>
            <span className="result-value">{result.visualEvidence}</span>
          </div>
          <div className="result-row">
            <span className="result-label">Recommended action</span>
            <span className="result-value">{result.recommendedAction}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function confidenceClass(c) {
  if (c === "high") return "healthy";
  if (c === "medium") return "warning";
  return "critical";
}

// Slice-1 pilot: disease-conditioned advisory (L1 extractive).
// Prediction is a labelled MOCK until the VLM exists; answers are quoted
// reference passages with sources, never generated doses.
function AdvisoryPanel() {
  const [symptoms, setSymptoms] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState(null);
  const [status, setStatus] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  async function submit() {
    setStatus("loading");
    setErrorMsg("");
    try {
      const pred = await api.post("/advisory/predict-mock", { symptoms });
      const res = await api.post("/advisory/ask", { prediction: pred.data.data, question });
      setAnswer(res.data.data);
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err?.response?.data?.error || "Could not reach the advisory service.");
    }
  }

  return (
    <div className="card diagnose-panel">
      <h3>Field Advisory <span className="status-pill status-warning">offline pilot</span></h3>
      <p className="panel-note">
        <span className="status-pill status-critical">mock prediction</span>{" "}
        <span className="status-pill status-warning">unreviewed content</span>{" "}
        Describe what you see; you get a quoted reference passage with its source — never a chemical dose.
      </p>

      <label className="field">
        <span>What do you see? (e.g. white mummies on the floor, mites on bees)</span>
        <input type="text" value={symptoms} onChange={(e) => setSymptoms(e.target.value)} placeholder="symptoms in plain words" />
      </label>
      <label className="field">
        <span>Your question</span>
        <input type="text" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="what is happening / what should I do" />
      </label>

      <button className="btn btn-primary" onClick={submit} disabled={!symptoms || status === "loading"}>
        {status === "loading" ? "Looking up…" : "Get advisory"}
      </button>

      {status === "error" && <p className="form-msg error">{errorMsg}</p>}

      {answer && (
        <div className="result-box">
          <div className="result-row">
            <span className="result-label">Advisory ({answer.mode})</span>
            <span className="result-value">{answer.headline}</span>
          </div>
          <div className="result-row">
            <span className="result-label">Reference passage</span>
            <span className="result-value">{answer.passage}</span>
          </div>
          <div className="result-row">
            <span className="result-label">What to do</span>
            <ul className="result-value">{answer.actions.map((a, i) => <li key={i}>{a}</li>)}</ul>
          </div>
          {answer.citations.map((c, i) => (
            <div className="result-row" key={i}>
              <span className="result-label">Source (unreviewed)</span>
              <span className="result-value">{c.publisher} — {c.title} <a href={c.url} target="_blank" rel="noreferrer">(open)</a></span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProductivityPanel() {
  const [form, setForm] = useState({
    avgWeightGainKgPerWeek: 0.6,
    avgTempC: 35,
    avgHumidityPct: 55,
    season: "summer",
    noOfColonies: 1,
    weeksRemainingInSeason: 10,
  });
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState(null);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function submit() {
    setStatus("loading");
    try {
      const res = await api.post("/productivity/predict", form);
      setResult(res.data.data);
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="card diagnose-panel">
      <h3>Productivity Prediction</h3>
      <p className="panel-note">
        A transparent, formula-based estimate from your sensor trends — every number here can be
        explained, unlike a black-box model.
      </p>

      <div className="predict-grid">
        <label className="field">
          <span>Avg weight gain (kg/week)</span>
          <input
            type="number" step="0.1"
            value={form.avgWeightGainKgPerWeek}
            onChange={(e) => update("avgWeightGainKgPerWeek", e.target.value)}
          />
        </label>
        <label className="field">
          <span>Avg brood temp (°C)</span>
          <input
            type="number" step="0.1"
            value={form.avgTempC}
            onChange={(e) => update("avgTempC", e.target.value)}
          />
        </label>
        <label className="field">
          <span>Avg humidity (%)</span>
          <input
            type="number"
            value={form.avgHumidityPct}
            onChange={(e) => update("avgHumidityPct", e.target.value)}
          />
        </label>
        <label className="field">
          <span>Season</span>
          <select value={form.season} onChange={(e) => update("season", e.target.value)}>
            {SEASONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label className="field">
          <span>No. of colonies</span>
          <input
            type="number" min="1"
            value={form.noOfColonies}
            onChange={(e) => update("noOfColonies", e.target.value)}
          />
        </label>
        <label className="field">
          <span>Weeks remaining in season</span>
          <input
            type="number" min="1"
            value={form.weeksRemainingInSeason}
            onChange={(e) => update("weeksRemainingInSeason", e.target.value)}
          />
        </label>
      </div>

      <button className="btn btn-primary" onClick={submit} disabled={status === "loading"}>
        {status === "loading" ? "Calculating…" : "Predict yield"}
      </button>

      {status === "error" && <p className="form-msg error">Could not reach the prediction service.</p>}

      {result && (
        <div className="result-box">
          <div className="predicted-yield">{result.predictedYieldKg} kg</div>
          <p className="panel-note">{result.explanation}</p>
        </div>
      )}
    </div>
  );
}

function LabReportPanel() {
  const [report, setReport] = useState({
    moisture: 18.2,
    sucrose: 3.1,
    reducing_sugars: 72.5,
    fructose_glucose_ratio: 1.15,
    hmf: 24.0,
    c4_sugars: 2.1,
    smr: "absent",
    tmr: "absent",
  });
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const PRESETS = [
    {
      name: "Pure Honey (Pass)",
      data: { moisture: 18.2, sucrose: 3.1, reducing_sugars: 72.5, fructose_glucose_ratio: 1.15, hmf: 24.0, c4_sugars: 2.1, smr: "absent", tmr: "absent" },
    },
    {
      name: "High Moisture (>20%)",
      data: { moisture: 22.4, sucrose: 3.0, reducing_sugars: 68.0, fructose_glucose_ratio: 1.05, hmf: 16.0, c4_sugars: 2.5, smr: "absent", tmr: "absent" },
    },
    {
      name: "Overheated (HMF >80)",
      data: { moisture: 17.8, sucrose: 2.5, reducing_sugars: 70.0, fructose_glucose_ratio: 1.10, hmf: 96.5, c4_sugars: 3.0, smr: "absent", tmr: "absent" },
    },
    {
      name: "Rice Syrup (SMR)",
      data: { moisture: 17.5, sucrose: 4.2, reducing_sugars: 66.0, fructose_glucose_ratio: 0.98, hmf: 22.0, c4_sugars: 4.0, smr: "detected", tmr: "absent" },
    },
  ];

  function update(field, val) {
    setReport((r) => ({ ...r, [field]: val }));
  }

  async function check() {
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await api.post("/advisory/check-lab-report", report);
      setResult(res.data);
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err?.response?.data?.error || "Check failed.");
    }
  }

  return (
    <div className="card diagnose-panel">
      <h3>
        FSSAI Lab Standards Checker{" "}
        <span className="status-pill status-healthy" style={{ fontSize: 10 }}>code-verified</span>
      </h3>
      <p className="panel-note">
        <span className="status-pill status-warning">FSSAI Reg 2.8.3</span>{" "}
        Numerical thresholds verified deterministically in code — never estimated by an AI model.
      </p>

      {/* Preset Chips */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        <span style={{ fontSize: 11, color: "var(--color-text-muted)", alignSelf: "center" }}>Presets:</span>
        {PRESETS.map((p, idx) => (
          <button
            key={idx}
            type="button"
            className="filter-btn"
            style={{ fontSize: 11, padding: "2px 7px" }}
            onClick={() => {
              setReport(p.data);
              setResult(null);
            }}
          >
            {p.name}
          </button>
        ))}
      </div>

      <div className="predict-grid">
        <label className="field">
          <span>Moisture (% max 20)</span>
          <input
            type="number" step="0.1"
            value={report.moisture || ""}
            onChange={(e) => update("moisture", e.target.value)}
          />
        </label>
        <label className="field">
          <span>Sucrose (% max 5)</span>
          <input
            type="number" step="0.1"
            value={report.sucrose || ""}
            onChange={(e) => update("sucrose", e.target.value)}
          />
        </label>
        <label className="field">
          <span>HMF (mg/kg max 80)</span>
          <input
            type="number" step="0.1"
            value={report.hmf || ""}
            onChange={(e) => update("hmf", e.target.value)}
          />
        </label>
        <label className="field">
          <span>Reducing sugars (% min 65)</span>
          <input
            type="number" step="0.1"
            value={report.reducing_sugars || ""}
            onChange={(e) => update("reducing_sugars", e.target.value)}
          />
        </label>
        <label className="field">
          <span>F/G ratio (min 0.95)</span>
          <input
            type="number" step="0.01"
            value={report.fructose_glucose_ratio || ""}
            onChange={(e) => update("fructose_glucose_ratio", e.target.value)}
          />
        </label>
        <label className="field">
          <span>C4 sugars (% max 7)</span>
          <input
            type="number" step="0.1"
            value={report.c4_sugars || ""}
            onChange={(e) => update("c4_sugars", e.target.value)}
          />
        </label>
        <label className="field">
          <span>SMR (Rice syrup marker)</span>
          <select value={report.smr} onChange={(e) => update("smr", e.target.value)}>
            <option value="absent">Absent (Pass)</option>
            <option value="detected">Detected (Adulterated)</option>
          </select>
        </label>
        <label className="field">
          <span>TMR (Trace rice marker)</span>
          <select value={report.tmr} onChange={(e) => update("tmr", e.target.value)}>
            <option value="absent">Absent (Pass)</option>
            <option value="detected">Detected (Adulterated)</option>
          </select>
        </label>
      </div>

      <button className="btn btn-primary" onClick={check} disabled={status === "loading"}>
        {status === "loading" ? "Evaluating…" : "Evaluate Compliance"}
      </button>

      {status === "error" && <p className="form-msg error">{errorMsg}</p>}

      {result && (
        <div className="result-box">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>
              Verdict:{" "}
              <span className={`status-pill ${result.compliant ? "status-healthy" : "status-critical"}`}>
                {result.compliant ? "✅ FULLY COMPLIANT" : `❌ NON-COMPLIANT (${result.failedCount} violations)`}
              </span>
            </span>
            <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
              {result.passedCount}/{result.totalTested} params passed
            </span>
          </div>

          <p style={{ fontSize: 12.5, margin: "6px 0", color: result.compliant ? "#065F46" : "#991B1B" }}>
            {result.explanation}
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
            {result.results.map((r, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "5px 8px",
                  borderRadius: 6,
                  fontSize: 12,
                  background: r.status === "PASS" ? "rgba(16, 185, 129, 0.08)" : "rgba(239, 68, 68, 0.12)",
                }}
              >
                <span>
                  <strong>{r.name}</strong>: {r.value} {r.unit && r.unit !== "detection" ? r.unit : ""} ({r.requirement})
                </span>
                <span style={{ fontWeight: 700, color: r.status === "PASS" ? "#059669" : "#DC2626" }}>
                  {r.status}
                </span>
              </div>
            ))}
          </div>

          {result.violations && result.violations.length > 0 && (
            <div style={{ marginTop: 6, padding: "8px 10px", background: "#FEF2F2", borderRadius: 6 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#991B1B", marginBottom: 4 }}>
                Biological & Regulatory Risks:
              </div>
              <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11.5, color: "#B91C1C" }}>
                {result.violations.map((v, i) => (
                  <li key={i}>
                    <strong>{v.name}</strong>: {v.risk} <em>({v.clause})</em>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ReferenceCardsPanel() {
  const [cards, setCards] = useState([]);
  const [category, setCategory] = useState("all");
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    api.get("/advisory/cards").then((res) => {
      setCards(res.data.data || []);
    }).catch(() => {});
  }, []);

  const CATEGORIES = [
    { key: "all", label: `All (${cards.length})` },
    { key: "disease", label: "Diseases & Inspection" },
    { key: "standards", label: "FSSAI Standards" },
    { key: "schemes", label: "KVIC & Gov Schemes" },
    { key: "seasonal", label: "Seasonal Calendar" },
  ];

  const filtered = cards.filter((c) => {
    if (category === "all") return true;
    if (category === "disease") return c.conditions.some((cd) => cd.includes("suspect") || cd.includes("checklist"));
    if (category === "standards") return c.conditions.some((cd) => cd.includes("fssai") || cd.includes("adulteration"));
    if (category === "schemes") return c.conditions.some((cd) => cd.includes("scheme"));
    if (category === "seasonal") return c.conditions.some((cd) => cd.includes("seasonal"));
    return true;
  });

  return (
    <div className="card" style={{ marginTop: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <h3 style={{ margin: 0 }}>RAG Reference Corpus</h3>
          <p className="panel-note">
            15 reviewed extension & regulation cards. In offline mode, the system retrieves only from these verified cards.
          </p>
        </div>
        <span className="status-pill status-healthy">{cards.length} cards loaded</span>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            type="button"
            className={`filter-btn ${category === cat.key ? "active" : ""}`}
            onClick={() => setCategory(cat.key)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
        {filtered.map((c) => {
          const isExpanded = expandedId === c.id;
          return (
            <div
              key={c.id}
              style={{
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
                padding: "12px 14px",
                background: "var(--color-surface-2)",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 13, color: "var(--color-text)" }}>{c.title}</span>
                <span className="status-pill status-warning" style={{ fontSize: 9.5 }}>{c.reviewStatus}</span>
              </div>

              <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                {c.parameters
                  ? c.parameters[0]
                  : c.signs
                  ? c.signs[0]
                  : c.provisions
                  ? c.provisions[0]
                  : c.guidelines
                  ? c.guidelines[0]
                  : ""}
              </div>

              {isExpanded && (
                <div style={{ fontSize: 11.5, display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
                  {c.whatToDo && (
                    <div>
                      <strong>What to do:</strong>
                      <ul style={{ margin: "2px 0 0", paddingLeft: 16 }}>
                        {c.whatToDo.slice(0, 3).map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {c.doNot && (
                    <div>
                      <strong style={{ color: "#DC2626" }}>Do not:</strong>
                      <ul style={{ margin: "2px 0 0", paddingLeft: 16 }}>
                        {c.doNot.slice(0, 2).map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div style={{ marginTop: 4, paddingTop: 4, borderTop: "1px dashed var(--color-border)" }}>
                    <strong>Source:</strong> {c.source.publisher} — <em>{c.source.title}</em>
                    {c.source.clause && <span> ({c.source.clause})</span>}
                  </div>
                </div>
              )}

              <button
                type="button"
                className="filter-btn"
                style={{ fontSize: 11, padding: "3px 8px", alignSelf: "flex-start", marginTop: 4 }}
                onClick={() => setExpandedId(isExpanded ? null : c.id)}
              >
                {isExpanded ? "▲ Show less" : "▼ View card details"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

