import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from "react-leaflet";
import { Link } from "react-router-dom";
import api from "../api.js";
import L from "leaflet";
import "./Map.css";

const INDIA_CENTER = [22.5, 79.5];

function FixLeafletIcons() {
  const map = useMap();
  useEffect(() => {
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
      iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
      shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
    });
  }, [map]);
  return null;
}

const CENTER_ICON = (color, label) =>
  new L.DivIcon({
    className: "custom-marker",
    html: `<div style="background:${color};width:18px;height:18px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35);"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -10],
  });

const FARMER_ICON = new L.DivIcon({
  className: "custom-marker",
  html: `<div style="background:#4ade80;width:12px;height:12px;border-radius:50%;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.25);"></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6],
  popupAnchor: [0, -8],
});

export default function MapPage() {
  const [geo, setGeo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCluster, setSelectedCluster] = useState(null);

  useEffect(() => {
    api.get("/map/geo").then((r) => { setGeo(r.data.data); setLoading(false); }).catch((e) => { setError(e?.response?.data?.error || "Failed to load map data"); setLoading(false); });
  }, []);

  if (loading) return <div className="page-container">Loading map…</div>;
  if (error) return <div className="page-container card" style={{ borderColor: "var(--color-danger)", color: "var(--color-danger)" }}>{error}</div>;

  const clusters = geo?.clusters || [];
  const unclustered = geo?.unclustered || [];
  const centres = geo?.centres || [];

  return (
    <div className="page-container map-page">
      <div className="map-head">
        <div>
          <div className="ledger-kicker">Honey Chain • India Clusters</div>
          <h1>Bee Farmer Clusters & KVIC Centres</h1>
          <p className="dashboard-sub">
            Active KVIC centres and government institutions across India. Clusters show bee farmer collectives with their assigned collectors.
            Click any point to view details — beekeeper info, collector info, and cluster statistics.
          </p>
        </div>
        <div className="map-legend">
          <span><span className="legend-dot kvic" />KVIC Centre</span>
          <span><span className="legend-dot gov" />Gov Institution</span>
          <span><span className="legend-dot khadi" />Khadi Centre</span>
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
              const color = c.kind === "kvic" ? "#2563eb" : c.kind === "gov" ? "#f59e0b" : "#7c3aed";
              return (
                <CircleMarker key={c.id} center={[c.lat, c.lng]} radius={10} pathOptions={{ color, fillColor: color, fillOpacity: 0.7, weight: 2 }}>
                  <Popup>
                    <div className="popup">
                      <strong>{c.name}</strong><br />
                      <span className="badge">{c.kind?.toUpperCase()}</span> • {c.city}, {c.state}<br />
                      <small>{c.address}</small>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}

            {clusters.map((cl) => {
              const clusterColor = "#dc2626";
              return (
                <div key={cl.id}>
                  <CircleMarker center={[cl.lat, cl.lng]} radius={18} pathOptions={{ color: clusterColor, fillColor: clusterColor, fillOpacity: 0.15, weight: 3, dashArray: "6 4" }}>
                    <Popup>
                      <div className="popup">
                        <strong>{cl.name}</strong><br />
                        <span className="badge">Cluster</span> • {cl.state}<br />
                        <small>Flower: {cl.flower}</small><br />
                        <small>Collector: {cl.collector?.name} ({cl.collector?.org})</small><br />
                        <small>Farmers: {cl.farmers?.length || 0}</small>
                        <br />
                        <Link className="btn btn-outline" to={`/map/cluster/${cl.id}`} style={{ fontSize: 12, padding: "4px 10px" }}>View cluster</Link>
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
                </div>
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
