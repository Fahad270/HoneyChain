import { NavLink } from "react-router-dom";
import "./Navbar.css";

const links = [
  { to: "/", label: "Register", end: true },
  { to: "/dashboard", label: "Hive Dashboard" },
  { to: "/learn", label: "Learn" },
  { to: "/diagnose", label: "Disease & Yield" },
];

export default function Navbar() {
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
      </div>
    </header>
  );
}
