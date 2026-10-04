import { useEffect, useState } from "react";
import api from "../api.js";
import "./Learn.css";

const LANGUAGES = [
  { key: "english", label: "English" },
  { key: "hindi", label: "हिंदी" },
  { key: "marathi", label: "मराठी" },
];

export default function Learn() {
  const [videos, setVideos] = useState([]);
  const [lang, setLang] = useState("english");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/videos")
      .then((res) => setVideos(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = videos.filter((v) => v.language === lang);

  return (
    <div className="page-container">
      <div className="pagehead">
        <div>
          <h1>Skill building</h1>
          <p>NBHM upskilling lessons · English / हिंदी / मराठी</p>
        </div>
        <div className="actions lang-toggle">
          {LANGUAGES.map((l) => (
            <button
              key={l.key}
              className={"lang-btn" + (lang === l.key ? " active" : "")}
              onClick={() => setLang(l.key)}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {loading && <p className="empty">Loading videos…</p>}

      {!loading && filtered.length === 0 && (
        <p className="empty">No videos yet in this language — check back soon.</p>
      )}

      <div className="video-grid">
        {filtered.map((v) => (
          <div className="video-card card" key={v.id}>
            <div className="video-frame">
              <iframe
                src={`https://www.youtube.com/embed/${v.youtubeId}`}
                title={v.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <div className="video-topic">{v.topic}</div>
            <h3 className="video-title">{v.title}</h3>
            <p className="video-desc">{v.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
