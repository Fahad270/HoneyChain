import { useState, useEffect } from "react";
import api from "../api.js";

const SAMPLE_UTTERANCES = [
  "12 kg mustard honey from hive 3",
  "16 kg multiflora honey from hive 5",
];

const OFFLINE_QUEUE_KEY = "honeychain_offline_harvest_queue";

export default function VoiceHarvestLogger({ onCommitHarvest, defaultPrevHash = "" }) {
  const [transcript, setTranscript] = useState("");
  const [listening, setListening] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parseResult, setParseResult] = useState(null);
  const [reviewData, setReviewData] = useState(null);
  const [offlineQueue, setOfflineQueue] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);
  const [speechSupported, setSpeechSupported] = useState(false);

  useEffect(() => {
    const hasSpeech = "webkitSpeechRecognition" in window || "SpeechRecognition" in window;
    setSpeechSupported(hasSpeech);
    try {
      const saved = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || "[]");
      setOfflineQueue(saved);
    } catch {
      setOfflineQueue([]);
    }
  }, []);

  function startSpeech() {
    const SpeechClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechClass) {
      setStatusMsg({ type: "warning", text: "Web Speech API not supported in this browser; please type your utterance below." });
      return;
    }
    const recognition = new SpeechClass();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setListening(true);
    setStatusMsg({ type: "info", text: "Listening… Speak your harvest details now." });

    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      setTranscript(text);
      setListening(false);
      setStatusMsg(null);
      handleParse(text);
    };

    recognition.onerror = (event) => {
      setListening(false);
      setStatusMsg({ type: "warning", text: `Speech recognition error: ${event.error}. You can type the transcript below.` });
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognition.start();
  }

  async function handleParse(textToParse) {
    const text = textToParse || transcript;
    if (!text.trim()) {
      setStatusMsg({ type: "warning", text: "Please enter or speak a harvest message first." });
      return;
    }
    setParsing(true);
    setStatusMsg(null);
    try {
      const res = await api.post("/advisory/voice-harvest", { transcript: text });
      const data = res.data.data;
      setParseResult(data);
      if (data.status === "needs_confirmation") {
        setReviewData({ ...data.extracted, prev_hash: defaultPrevHash });
      } else {
        setReviewData(null);
      }
    } catch {
      // Local fallback parser in case backend is offline
      setStatusMsg({ type: "info", text: "Backend unreachable — using local client extractor (offline fallback)." });
      const localExtracted = localExtract(text);
      if (localExtracted.hive_id && localExtracted.weight_kg) {
        setParseResult({ status: "needs_confirmation", extracted: localExtracted });
        setReviewData({ ...localExtracted, prev_hash: defaultPrevHash });
      } else {
        setParseResult({
          status: "needs_clarification",
          prompt: "Could not extract complete details offline. Please specify hive ID and weight in kg.",
        });
      }
    } finally {
      setParsing(false);
    }
  }

  function localExtract(str) {
    const norm = str.toLowerCase();
    const wordMap = {
      one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
      eleven: 11, twelve: 12, ek: 1, do: 2, teen: 3, char: 4, chaar: 4, paanch: 5, panch: 5,
      chhe: 6, saat: 7, aath: 8, nau: 9, das: 10, gyarah: 11, barah: 12, bara: 12, bees: 20
    };
    const parseN = (t) => {
      if (!t) return null;
      const f = parseFloat(t);
      if (!isNaN(f)) return f;
      return wordMap[t] || null;
    };

    // Weight
    let weight_kg = null;
    const wm = norm.match(/([a-z0-9\.\u0900-\u097F]+)\s*(?:kg|kilos?|किलो|किग्रा)/i)
            || norm.match(/(?:weight|yield|nikala|tha)?\s*([a-z0-9\.\u0900-\u097F]+)\s*(?:kg|kilos?)/i);
    if (wm) {
      const val = parseN(wm[1]);
      if (val !== null && val > 0 && val <= 500) weight_kg = val;
    }

    // Hive ID
    let hive_id = null;
    const mExplicit = norm.match(/(?:(?:\b(?:hive|box|peti|chamber))|(?:बॉक्स|पेटी))\s*[-_#]?\s*([a-z0-9\u0900-\u097F]+)/i);
    const mHindiOrder = norm.match(/([a-z0-9\u0900-\u097F]+)\s*(?:number|no\.?)?\s*(?:hive|box|peti|chamber|बॉक्स|पेटी)/i);
    const mPrep = norm.match(/\bfrom\s+(?:hive\s+|box\s+|peti\s+)?([a-z0-9\u0900-\u097F]+)/i)
               || norm.match(/([a-z0-9\u0900-\u097F]+)\s+(?:se|से)\b/i);

    const candMatch = mExplicit || mHindiOrder || mPrep;
    if (candMatch) {
      const v = parseN(candMatch[1]);
      if (v !== null && v !== weight_kg) {
        hive_id = `HIVE-${String(v).padStart(2, "0")}`;
      } else if (/^[0-9]+$/.test(candMatch[1])) {
        hive_id = `HIVE-${candMatch[1].padStart(2, "0")}`;
      }
    }

    const flower_source = /mustard|sarson/i.test(norm) ? "mustard"
                        : /litchi/i.test(norm) ? "litchi"
                        : /eucalyptus|safeda/i.test(norm) ? "eucalyptus"
                        : /acacia|kikar/i.test(norm) ? "acacia"
                        : "multifloral";

    return {
      hive_id,
      weight_kg,
      flower_source,
      date: new Date().toISOString().slice(0, 10),
    };
  }

  function handleSaveOffline() {
    if (!reviewData) return;
    const item = {
      id: `queue_${Date.now()}`,
      stage: "honey_extraction",
      prev_hash: reviewData.prev_hash || defaultPrevHash || "",
      data: {
        hive_id: reviewData.hive_id,
        weight_kg: Number(reviewData.weight_kg),
        flower_source: reviewData.flower_source,
        harvest_date: reviewData.date,
      },
      queuedAt: new Date().toISOString(),
    };

    const nextQueue = [...offlineQueue, item];
    setOfflineQueue(nextQueue);
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(nextQueue));
    setReviewData(null);
    setParseResult(null);
    setTranscript("");
    setStatusMsg({ type: "success", text: "Saved to offline queue. Sync when connectivity is restored." });
  }

  async function handleCommitOnline() {
    if (!reviewData) return;
    try {
      await onCommitHarvest({
        stage: "honey_extraction",
        prev_hash: reviewData.prev_hash || defaultPrevHash || "",
        data: {
          hive_id: reviewData.hive_id,
          weight_kg: Number(reviewData.weight_kg),
          flower_source: reviewData.flower_source,
          harvest_date: reviewData.date,
        },
      });
      setReviewData(null);
      setParseResult(null);
      setTranscript("");
      setStatusMsg({ type: "success", text: "Harvest confirmed & committed to HoneyChain ledger!" });
    } catch (err) {
      setStatusMsg({
        type: "warning",
        text: `Commit failed (${err?.message || "network error"}). You can save it to the Offline Queue instead.`,
      });
    }
  }

  async function syncQueue() {
    if (!offlineQueue.length) return;
    setSyncing(true);
    setStatusMsg(null);
    let successCount = 0;
    const remaining = [];

    for (const item of offlineQueue) {
      try {
        await onCommitHarvest(item);
        successCount++;
      } catch {
        remaining.push(item);
      }
    }

    setOfflineQueue(remaining);
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remaining));
    setSyncing(false);
    setStatusMsg({
      type: successCount > 0 ? "success" : "warning",
      text: `Synced ${successCount} queued harvests to the blockchain. ${remaining.length} remaining.`,
    });
  }

  return (
    <div className="card voice-logger-card" style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h3 style={{ margin: 0, fontSize: 16, display: "flex", alignItems: "center", gap: 6 }}>
          <span>🎙️ Voice Harvest Logging</span>
        </h3>
        {offlineQueue.length > 0 && (
          <span className="status-pill status-warning" style={{ fontSize: 11 }}>
            ✈️ {offlineQueue.length} queued offline
          </span>
        )}
      </div>

      <p className="dashboard-sub" style={{ fontSize: 12.5, margin: "0 0 10px", color: "var(--color-text-muted)" }}>
        Speak naturally or type harvest details. Verify extracted slots before saving.
      </p>

      {/* Voice controls & input */}
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <input
          type="text"
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="e.g. 12 kg mustard honey from hive 3"
          style={{ flex: 1, padding: "7px 10px", borderRadius: 8, border: "1px solid var(--color-border)", fontSize: 13 }}
          onKeyDown={(e) => e.key === "Enter" && handleParse()}
        />
        <button
          type="button"
          className="btn btn-honey btn-sm"
          onClick={startSpeech}
          disabled={listening || parsing}
          style={{ whiteSpace: "nowrap" }}
        >
          {listening ? "🔴 Listening…" : "🎤 Speak"}
        </button>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => handleParse()}
          disabled={parsing || !transcript.trim()}
          style={{ whiteSpace: "nowrap" }}
        >
          {parsing ? "Parsing…" : "Extract"}
        </button>
      </div>

      {/* Quick sample chips */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, marginBottom: 10 }}>
        <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>Quick samples:</span>
        {SAMPLE_UTTERANCES.map((sample, idx) => (
          <button
            key={idx}
            type="button"
            className="filter-btn"
            style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6 }}
            onClick={() => {
              setTranscript(sample);
              handleParse(sample);
            }}
          >
            "{sample}"
          </button>
        ))}
      </div>

      {statusMsg && (
        <div className={`form-msg ${statusMsg.type}`} style={{ marginBottom: 12 }}>
          {statusMsg.text}
        </div>
      )}

      {/* Clarification prompt if slots are missing */}
      {parseResult && parseResult.status === "needs_clarification" && (
        <div style={{ padding: 12, background: "#FFFBEB", borderRadius: 8, border: "1px solid #FDE68A", marginBottom: 12 }}>
          <div style={{ fontWeight: 600, color: "#92400E", marginBottom: 4 }}>Needs Clarification:</div>
          <div style={{ fontSize: 13, color: "#B45309" }}>{parseResult.prompt}</div>
        </div>
      )}

      {/* CONFIRM-BEFORE-COMMIT MODAL / CARD */}
      {reviewData && (
        <div style={{ padding: 14, background: "#ECFDF5", borderRadius: 8, border: "2px solid #10B981", marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontWeight: 700, color: "#065F46" }}>✅ Verify Extracted Harvest Details</span>
            <span className="status-pill status-healthy">Honey Extraction Record</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#065F46" }}>Hive ID *</label>
              <input
                type="text"
                value={reviewData.hive_id || ""}
                onChange={(e) => setReviewData({ ...reviewData, hive_id: e.target.value })}
                style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #A7F3D0" }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#065F46" }}>Harvest Weight (kg) *</label>
              <input
                type="number"
                step="0.1"
                value={reviewData.weight_kg || ""}
                onChange={(e) => setReviewData({ ...reviewData, weight_kg: e.target.value })}
                style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #A7F3D0" }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#065F46" }}>Floral Source</label>
              <input
                type="text"
                value={reviewData.flower_source || ""}
                onChange={(e) => setReviewData({ ...reviewData, flower_source: e.target.value })}
                style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #A7F3D0" }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#065F46" }}>Harvest Date</label>
              <input
                type="date"
                value={reviewData.date || ""}
                onChange={(e) => setReviewData({ ...reviewData, date: e.target.value })}
                style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #A7F3D0" }}
              />
            </div>
          </div>

          <div style={{ fontSize: 11, color: "#047857", marginBottom: 12 }}>
            🔒 <em>Confirming will mint a tamper-evident block into the HoneyChain DAG ledger.</em>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleCommitOnline}
              style={{ flex: 2, background: "#059669", borderColor: "#059669" }}
            >
              Confirm & Mint to Blockchain
            </button>
            <button
              type="button"
              className="btn btn-honey"
              onClick={handleSaveOffline}
              style={{ flex: 1 }}
              title="Save to local queue if in airplane mode"
            >
              Save Offline
            </button>
            <button
              type="button"
              className="filter-btn"
              onClick={() => {
                setReviewData(null);
                setParseResult(null);
              }}
              style={{ flex: 1 }}
            >
              Discard
            </button>
          </div>
        </div>
      )}

      {/* Offline Queue Sync Bar */}
      {offlineQueue.length > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "#FEF3C7", borderRadius: 8 }}>
          <span style={{ fontSize: 12, color: "#92400E" }}>
            <strong>{offlineQueue.length} harvest(s)</strong> stored locally in offline storage.
          </span>
          <button
            type="button"
            className="btn btn-primary"
            style={{ fontSize: 11, padding: "4px 10px" }}
            onClick={syncQueue}
            disabled={syncing}
          >
            {syncing ? "Syncing…" : "Sync Now to Ledger"}
          </button>
        </div>
      )}
    </div>
  );
}
