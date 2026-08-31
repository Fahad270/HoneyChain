import { useState } from "react";
import api from "../api.js";
import "./DiseaseDetection.css";

const SEASONS = ["spring", "summer", "monsoon", "autumn", "winter"];

export default function DiseaseDetection() {
  return (
    <div className="page-container">
      <h1>Disease Detection &amp; Productivity Prediction</h1>
      <p className="dashboard-sub">
        Upload a photo for a quick visual read, or estimate expected honey yield from current sensor trends.
      </p>
      <div className="diagnose-layout">
        <DiseasePanel />
        <ProductivityPanel />
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
      const res = await api.post("/disease/detect", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
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
