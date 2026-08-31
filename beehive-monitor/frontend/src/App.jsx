import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import Register from "./pages/Register.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Learn from "./pages/Learn.jsx";
import DiseaseDetection from "./pages/DiseaseDetection.jsx";
import Ledger from "./pages/Ledger.jsx";
import Verify from "./pages/Verify.jsx";

export default function App() {
  return (
    <div>
      <Navbar />
      <Routes>
        <Route path="/" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/learn" element={<Learn />} />
        <Route path="/diagnose" element={<DiseaseDetection />} />
        <Route path="/ledger" element={<Ledger />} />
        <Route path="/verify/:hash" element={<Verify />} />
        <Route path="/verify" element={<Verify />} />
      </Routes>
    </div>
  );
}
