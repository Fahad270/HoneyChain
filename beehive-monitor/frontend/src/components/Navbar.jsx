import { NavLink } from "react-router-dom";
import { useRole } from "../context/RoleContext.jsx";
import "./Navbar.css";

const links = [
  { to: "/", label: "Register", end: true },
  { to: "/dashboard", label: "Hive Dashboard" },
  { to: "/map", label: "Map" },
  { to: "/ledger", label: "Ledger" },
  { to: "/twin", label: "My Twin" },
  { to: "/learn", label: "Learn" },
  { to: "/diagnose", label: "Disease & Yield" },
];

export default function Navbar() {
  const { role, setRole, ROLE_META } = useRole();
  return (
    <header className="navbar">
      <div className="navbar-inner">
        <div className="navbar-brand">
          <span className="navbar-logo">🐝</span>
          <span>Madhu Setu</span>
        </div>
        <nav className="navbar-links">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) => "navbar-link" + (isActive ? " active" : "")}
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="role-switch" title="Two tiers from your workflow image">
          <button
            className={`role-btn ${role === "beekeeper" ? "active" : ""}`}
            onClick={() => setRole("beekeeper")}
            title="Beekeeper — Steps 1–2: Hive & Harvest"
          >
            {ROLE_META.beekeeper.badge} Beekeeper
          </button>
          <button
            className={`role-btn ${role === "kvic" ? "active" : ""}`}
            onClick={() => setRole("kvic")}
            title="KVIC — Steps 3–8: Collective → Khadi"
          >
            {ROLE_META.kvic.badge} KVIC
          </button>
        </div>
      </div>
    </header>
  );
}
