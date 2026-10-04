import { useState, useMemo } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { useRole } from "../context/RoleContext.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import BeeMark from "./BeeMark.jsx";
import "./Navbar.css";

export default function Navbar() {
  const { role, ROLE_META, user, logout } = useRole();
  const { lang, toggleLanguage, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const links = useMemo(() => {
    if (role === "beekeeper") {
      return [
        { to: "/twin", label: t("my_twin", "My Twin") },
        { to: "/dashboard", label: t("hives", "Hives") },
        { to: "/ledger", label: t("harvest_log", "Harvest Log") },
        { to: "/diagnose", label: t("ai_lab", "AI Lab") },
        { to: "/map", label: t("map", "Map") },
        { to: "/learn", label: t("learn", "Learn") },
      ];
    }
    if (role === "kvic") {
      return [
        { to: "/ledger", label: t("custody_ledger", "Custody Ledger") },
        { to: "/graph", label: t("dag_graph", "DAG Graph") },
        { to: "/dashboard", label: t("hives", "Hives") },
        { to: "/map", label: t("centres", "Centres") },
        { to: "/diagnose", label: t("ai_lab", "AI Lab") },
        { to: "/learn", label: t("learn", "Learn") },
      ];
    }
    // Public visitor / consumer / auditor
    return [
      { to: "/verify", label: t("verify_jar", "Verify Jar") },
      { to: "/ledger", label: t("public_ledger", "Public Ledger") },
      { to: "/graph", label: t("dag_graph", "DAG Graph") },
      { to: "/dashboard", label: t("hives", "Hives") },
      { to: "/map", label: t("map", "Map") },
      { to: "/diagnose", label: t("ai_lab", "AI Lab") },
      { to: "/learn", label: t("learn", "Learn") },
    ];
  }, [role, lang, t]);

  function handleLogout() {
    logout();
    setOpen(false);
    navigate("/");
  }

  const brandDestination = role === "beekeeper" ? "/twin" : role === "kvic" ? "/ledger" : "/ledger";

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link className="navbar-brand" to={brandDestination} onClick={() => setOpen(false)}>
          <BeeMark size={32} />
          <span className="brand-text">
            <span className="brand-name">Madhu Shakti</span>
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
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="nav-actions-group">
          <button
            type="button"
            className="lang-switcher-btn"
            onClick={toggleLanguage}
            title={lang === "en" ? "Switch to Hindi (हिन्दी)" : "Switch to English"}
            aria-label="Toggle language"
          >
            🌐 {lang === "en" ? "हिन्दी" : "English"}
          </button>

          {user ? (
            <>
              <span className={`tier-pill tier-${role}`} title={`${ROLE_META[role]?.label} — ${ROLE_META[role]?.desc}. Tier comes from your account, not a switch.`}>
                {ROLE_META[role]?.badge} {ROLE_META[role]?.label}
              </span>
              <div className="account-chip" title={`${user.name} · ${role} tier`}>
                <Link className="account-name-link" to="/account" onClick={() => setOpen(false)}>
                  {user.name.split(" ")[0]}
                </Link>
                <button className="account-logout" onClick={handleLogout} title={t("logout", "Log out")}>⏻</button>
              </div>
            </>
          ) : (
            <div className="public-auth-group">
              <span className="tier-pill tier-public" title="Public Audit Mode: anyone can inspect ledger blocks and verify jars. Log in to mint or claim identities.">
                👁️ Public Audit
              </span>
              <Link className="btn btn-honey btn-account" to="/account" onClick={() => setOpen(false)}>
                {t("login", "Log in")}
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
