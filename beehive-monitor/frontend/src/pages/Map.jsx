import { Fragment, useEffect, useState } from "react";
import { MapContainer, TileLayer, Popup, CircleMarker, useMap } from "react-leaflet";
import { Link } from "react-router-dom";
import api from "../api.js";
import L from "leaflet";
import "./Map.css";

const INDIA_CENTER = [22.5, 79.5];

const KIND_COLORS = { kvic: "#2563eb", gov: "#f59e0b", khadi: "#7c3aed", training: "#0d9488" };
const LEVEL_LABEL = { headquarters: "HQ", zonal: "Zonal", state: "State", divisional: "Divisional", store: "Khadi store", institute: "Institute", board: "Board" };

function FixLeafletIcons() {
  const map = useMap();
  useEffect(() => {
    if (L.Icon.Default.prototype._getIconUrl) {
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });
    }
  }, [map]);
  return null;
}

export default function MapPage() {
  const [geo, setGeo] = useState(null);
  const [directory, setDirectory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCluster, setSelectedCluster] = useState(null);
  const [selectedCentre, setSelectedCentre] = useState(null);

  useEffect(() => {
    Promise.all([api.get("/map/geo"), api.get("/map/kvic-centres").catch(() => null)]).then(([g, d]) => {
      setGeo(g.data.data);
      if (d) setDirectory(d.data.data);
      setLoading(false);
    }).catch((e) => { setError(e?.response?.data?.error || "Failed to load map data"); setLoading(false); });
  }, []);

  if (loading) return <div className="page-container">Loading map…</div>;
  if (error) return <div className="page-container card" style={{ borderColor: "var(--color-danger)", color: "var(--color-danger)" }}>{error}</div>;

  const clusters = geo?.clusters || [];
  const unclustered = geo?.unclustered || [];
  // Prefer the live directory (real addresses + staff rosters); fall back to geo.
  const centres = directory?.centres?.length ? directory.centres : (geo?.centres || []);
  const selectedCentreData = selectedCentre ? centres.find((c) => c.id === selectedCentre) : null;

  return (
    <div className="page-container map-page">
      <div className="map-head">
        <div>
          <div className="ledger-kicker">Honey Chain • India Clusters</div>
          <h1>Bee Farmer Clusters <span className="amp">&</span> KVIC Centres</h1>
          <p className="dashboard-sub">
            {centres.length} real, published KVIC / Khadi / beekeeping offices across India — addresses from the
            PMEGP directory, kvic.gov.in and nbb.gov.in (pins are city-level; the street address is authoritative).
            Clusters show bee farmer collectives with their assigned collectors.
          </p>
        </div>
        <div className="map-legend">
          <span><span className="legend-dot kvic" />KVIC Centre</span>
          <span><span className="legend-dot gov" />Gov Institution</span>
          <span><span className="legend-dot khadi" />Khadi Centre</span>
          <span><span className="legend-dot training" />Bee Institute</span>
          <span><span className="legend-dot farmer" />Bee Farmer</span>
          <span><span className="legend-dot cluster" />Cluster Centre</span>
        </div>
      </div>

      <div className="map-layout">
        <div className="map-container">
          <MapContainer center={INDIA_CENTER} zoom={5} style={{ height: "100%", width: "100%", borderRadius: 12 }}>
            <FixLeafletIcons />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {centres.map((c) => {
              const color = KIND_COLORS[c.kind] || "#7c3aed";
              return (
                <CircleMarker key={c.id} center={[c.lat, c.lng]} radius={c.level === "headquarters" ? 12 : 10} pathOptions={{ color, fillColor: color, fillOpacity: 0.7, weight: 2 }}>
                  <Popup>
                    <div className="popup">
                      <strong>{c.name}</strong><br />
                      <span className="badge">{LEVEL_LABEL[c.level] || c.kind?.toUpperCase()}</span> • {c.city}, {c.state}<br />
                      <small>{c.address}{c.pin ? ` — ${c.pin}` : ""}</small><br />
                      {c.phone && <small>☎ {c.phone}</small>}{c.phone && c.email && <br />}{c.email && <small>✉ {c.email}</small>}<br />
                      {c.verified === "official" && <small style={{ color: "var(--color-success)" }}>✓ published source</small>}
                      {(c.staff?.length > 0 || (c.clusters || []).length > 0) && (
                        <small> · {c.staff?.length || 0} staff · {(c.clusters || []).length} cluster(s)</small>
                      )}
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}

            {clusters.map((cl) => {
              const clusterColor = "#dc2626";
              return (
                <Fragment key={cl.id}>
                  <CircleMarker center={[cl.lat, cl.lng]} radius={18} pathOptions={{ color: clusterColor, fillColor: clusterColor, fillOpacity: 0.15, weight: 3, dashArray: "6 4" }}>
                    <Popup>
                      <div className="popup">
                        <strong>{cl.name}</strong><br />
                        <span className="badge">Cluster</span> • {cl.state}<br />
                        <small>Flower: {cl.flower}</small><br />
                        <small>Collector: {cl.collector?.name} ({cl.collector?.org})</small><br />
                        <small>Farmers: {cl.farmers?.length || 0}</small>
                      </div>
                    </Popup>
                  </CircleMarker>

                  {cl.farmers?.map((f, i) => (
                    <CircleMarker key={`${cl.id}-f-${i}`} center={[f.lat, f.lng]} radius={6} pathOptions={{ color: "#16a34a", fillColor: "#4ade80", fillOpacity: 0.85, weight: 1 }}>
                      <Popup>
                        <div className="popup">
                          <strong>{f.name}</strong><br />
                          <span className="badge">Farmer</span> • {f.village}, {cl.state}<br />
                          <small>Colonies: {f.colonies}</small><br />
                          <small>Phone: {f.phone}</small>
                        </div>
                      </Popup>
                    </CircleMarker>
                  ))}
                </Fragment>
              );
            })}

            {unclustered.map((f, i) => (
              <CircleMarker key={`unclustered-${i}`} center={[f.lat, f.lng]} radius={6} pathOptions={{ color: "#16a34a", fillColor: "#4ade80", fillOpacity: 0.85, weight: 1 }}>
                <Popup>
                  <div className="popup">
                    <strong>{f.name}</strong><br />
                    <span className="badge">Farmer</span> • {f.village}, {f.state}<br />
                    <small>Colonies: {f.colonies}</small><br />
                    <small>Phone: {f.phone}</small>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>

        <div className="map-sidebar">
          <div className="card">
            <h3>Real KVIC centres</h3>
            <p className="dashboard-sub">Published offices — pick one for address, source and staff.</p>
            <label className="field" style={{ marginTop: 10 }}>
              <span>Centre ({centres.length})</span>
              <select value={selectedCentre || ""} onChange={(e) => setSelectedCentre(e.target.value || null)}>
                <option value="">— Select —</option>
                {centres.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} — {c.city}</option>
                ))}
              </select>
            </label>
          </div>

          {selectedCentreData && (
            <div className="card cluster-detail">
              <h3>{selectedCentreData.name}</h3>
              <div className="detail-grid">
                <div className="detail-row"><span>Level</span><strong>{LEVEL_LABEL[selectedCentreData.level] || selectedCentreData.level || "—"}</strong></div>
                <div className="detail-row"><span>Address</span><strong>{selectedCentreData.address}{selectedCentreData.pin ? ` — ${selectedCentreData.pin}` : ""}</strong></div>
                {selectedCentreData.phone && <div className="detail-row"><span>Phone</span><strong>{selectedCentreData.phone}</strong></div>}
                {selectedCentreData.email && <div className="detail-row"><span>Email</span><strong>{selectedCentreData.email}</strong></div>}
                <div className="detail-row"><span>Source</span><strong>{selectedCentreData.verified === "official" ? "✓ published" : "directory listing"}</strong></div>
                {(selectedCentreData.clusters || []).length > 0 && (
                  <div className="detail-row"><span>Honey clusters</span><strong>{selectedCentreData.clusters.map((c) => c.name).join(", ")}</strong></div>
                )}
              </div>
              {(selectedCentreData.staff || []).length > 0 ? (
                <>
                  <h4 style={{ marginTop: 12 }}>Claimed staff ({selectedCentreData.staff.length})</h4>
                  <div className="farmer-list">
                    {selectedCentreData.staff.map((s, i) => (
                      <div key={i} className="farmer-item card" style={{ padding: 10, marginBottom: 8 }}>
                        <div className="farmer-head">
                          <strong>{s.name}</strong>
                          {!s.centreVerified && <span className="badge">self-asserted</span>}
                        </div>
                        <div className="farmer-meta">
                          <span>{[s.designation, s.orgName].filter(Boolean).join(" · ") || "KVIC staff"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="dashboard-sub" style={{ marginTop: 10 }}>No staff claimed this centre yet — <Link to="/account">create a KVIC account</Link> to attach.</p>
              )}
            </div>
          )}

          <div className="card">
            <h3>Clusters</h3>
            <p className="dashboard-sub">Select a cluster to view farmers and collector details.</p>
            <div className="cluster-list">
              {clusters.map((cl) => (
                <button key={cl.id} className={`cluster-item ${selectedCluster === cl.id ? "active" : ""}`} onClick={() => setSelectedCluster(cl.id)}>
                  <div className="cluster-item-head">
                    <strong>{cl.name}</strong>
                    <span className="badge">{cl.state}</span>
                  </div>
                  <div className="cluster-item-meta">
                    <span>Collector: {cl.collector?.name}</span>
                    <span>Flower: {cl.flower}</span>
                    <span>Farmers: {cl.farmers?.length || 0}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {selectedCluster && (() => {
            const cl = clusters.find((c) => c.id === selectedCluster);
            if (!cl) return null;
            return (
              <div className="card cluster-detail">
                <h3>{cl.name}</h3>
                <div className="detail-grid">
                  <div className="detail-row"><span>State</span><strong>{cl.state}</strong></div>
                  <div className="detail-row"><span>Flower source</span><strong>{cl.flower}</strong></div>
                  <div className="detail-row"><span>Collector</span><strong>{cl.collector?.name} ({cl.collector?.org})</strong></div>
                  <div className="detail-row"><span>Collector phone</span><strong>{cl.collector?.phone}</strong></div>
                  <div className="detail-row"><span>Farmers in cluster</span><strong>{cl.farmers?.length || 0}</strong></div>
                </div>

                <h4 style={{ marginTop: 12 }}>Farmers</h4>
                <div className="farmer-list">
                  {cl.farmers?.map((f, i) => (
                    <div key={i} className="farmer-item card" style={{ padding: 10, marginBottom: 8 }}>
                      <div className="farmer-head">
                        <strong>{f.name}</strong>
                        <span className="badge">{f.village}</span>
                      </div>
                      <div className="farmer-meta">
                        <span>Colonies: {f.colonies}</span>
                        <span>Phone: {f.phone}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="cluster-actions">
                  <Link className="btn btn-primary" to="/" style={{ width: "100%", textAlign: "center" }}>Register new farmer</Link>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
