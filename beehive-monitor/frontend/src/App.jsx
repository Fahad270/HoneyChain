import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import Register from "./pages/Register.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Learn from "./pages/Learn.jsx";
import DiseaseDetection from "./pages/DiseaseDetection.jsx";
import Ledger from "./pages/Ledger.jsx";
import Verify from "./pages/Verify.jsx";
import FarmerTwin from "./pages/FarmerTwin.jsx";
import MapPage from "./pages/Map.jsx";
import Account from "./pages/Account.jsx";
import Graph from "./pages/Graph.jsx";

export default function App() {
  return (
    <div className="app-shell">
      <Navbar />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Register />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/learn" element={<Learn />} />
          <Route path="/diagnose" element={<DiseaseDetection />} />
          <Route path="/ledger" element={<Ledger />} />
          <Route path="/graph" element={<Graph />} />
          <Route path="/verify/:hash" element={<Verify />} />
          <Route path="/verify" element={<Verify />} />
          <Route path="/twin" element={<FarmerTwin />} />
          <Route path="/track" element={<FarmerTwin />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/account" element={<Account />} />
        </Routes>
      </main>
      <footer className="app-footer">
        <div className="app-footer-inner">
          <span className="app-footer-brand">
            <span className="app-footer-hex">🐝</span>
            Madhu Shakti · HoneyChain
          </span>
          <span>Beekeeper → Collective → Processor → Lab → Khadi · every hop a block, every jar a proof</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>SHA256 · DAG · IPFS</span>
        </div>
      </footer>
    </div>
  );
}
