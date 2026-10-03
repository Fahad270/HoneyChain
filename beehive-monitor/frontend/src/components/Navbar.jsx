import { useState } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { useRole } from "../context/RoleContext.jsx";
import "./Navbar.css";

const links = [
  { to: "/", label: "Register", end: true, icon: "📝" },
  { to: "/dashboard", label: "Hives", icon: "⬡" },
  { to: "/map", label: "Map", icon: "🗺️" },
  { to: "/ledger", label: "Ledger", icon: "🔗" },
  { to: "/graph", label: "Graph", icon: "📊" },
  { to: "/twin", label: "My Twin", icon: "🍯" },
  { to: "/learn", label: "Learn", icon: "🎓" },
  { to: "/diagnose", label: "AI Lab", icon: "🔬" },
];

export default function Navbar() {
  const { role, ROLE_META, user, logout } = useRole();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    setOpen(false);
    navigate("/");
  }

  return (
    <header className="navbar">
      <div className="navbar-glow" aria-hidden />
      <div className="navbar-inner">
        <Link className="navbar-brand" to="/" onClick={() => setOpen(false)}>
          <span className="brand-hex" aria-hidden>🐝</span>
          <span className="brand-text">
            <span className="brand-name">Madhu Setu</span>
            <span className="brand-sub">HoneyChain · NBHM</span>
          </span>
        </Link>

        <button
          className={`nav-toggle ${open ? "open" : ""}`}
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          <span /><span /><span />
        </button>

        <nav className={`navbar-links ${open ? "open" : ""}`}>
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) => "navbar-link" + (isActive ? " active" : "")}
            >
              <span className="nav-ico" aria-hidden>{l.icon}</span>
              {l.label}
            </NavLink>
          ))}
        </nav>

        {user ? (
          <>
            <span className={`tier-pill tier-${role}`} title={`${ROLE_META[role]?.label} — ${ROLE_META[role]?.desc}. Tier comes from your account, not a switch.`}>
              {ROLE_META[role]?.badge} {ROLE_META[role]?.label}
            </span>
            <div className="account-chip" title={`${user.name} · ${role} tier`}>
              <Link className="account-name-link" to="/account" onClick={() => setOpen(false)}>
                {user.name.split(" ")[0]}
              </Link>
              <button className="account-logout" onClick={handleLogout} title="Log out">⏻</button>
            </div>
          </>
        ) : (
          <Link className="btn btn-honey btn-account" to="/account" onClick={() => setOpen(false)}>
            Log in
          </Link>
        )}
      </div>
    </header>
  );
}
