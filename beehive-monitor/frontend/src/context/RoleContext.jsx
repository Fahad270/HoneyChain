import { createContext, useContext, useCallback, useEffect, useState } from "react";
import api from "../api.js";

const RoleContext = createContext(null);

const ROLE_META = {
  beekeeper: {
    label: "Beekeeper",
    desc: "Steps 1–2: Hive + Harvest",
    badge: "🐝",
  },
  kvic: {
    label: "KVIC",
    desc: "Steps 3–8: Collective → Khadi",
    badge: "🏛️",
  },
};

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

// Two-tier accounts — the ONLY source of role.
// There is no demo role switch: logged out means no tier (reads only),
// logged in means your account's tier (writes allowed per tier).
// (An old `honey_role` key may linger in browsers; it is ignored.)
export function RoleProvider({ children }) {
  const [user, setUser] = useState(() => loadJSON("honey_user", null));
  const [token, setToken] = useState(() => {
    try { return localStorage.getItem("honey_token") || ""; } catch { return ""; }
  });
  const [authChecked, setAuthChecked] = useState(false);

  const role = user?.role || null;
  const locked = Boolean(user);

  const applySession = useCallback((u, t) => {
    setUser(u);
    setToken(t);
    try {
      localStorage.setItem("honey_token", t);
      localStorage.setItem("honey_user", JSON.stringify(u));
      localStorage.removeItem("honey_role");
    } catch {}
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken("");
    try {
      localStorage.removeItem("honey_token");
      localStorage.removeItem("honey_user");
    } catch {}
  }, []);

  const login = useCallback(async (loginId, password) => {
    const res = await api.post("/auth/login", { login: loginId, password });
    applySession(res.data.data.user, res.data.data.token);
    return res.data.data;
  }, [applySession]);

  const signup = useCallback(async (payload) => {
    const res = await api.post("/auth/register", payload);
    applySession(res.data.data.user, res.data.data.token);
    return res.data.data;
  }, [applySession]);

  // Re-validate a persisted session on boot; drop it quietly if dead.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token) {
        setAuthChecked(true);
        return;
      }
      try {
        const res = await api.get("/auth/me");
        if (!cancelled) {
          setUser(res.data.data.user);
          try { localStorage.setItem("honey_user", JSON.stringify(res.data.data.user)); } catch {}
        }
      } catch {
        if (!cancelled) logout();
      } finally {
        if (!cancelled) setAuthChecked(true);
      }
    })();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <RoleContext.Provider value={{ role, ROLE_META, user, token, locked, authChecked, login, logout, signup, refreshUser: async () => {
      try {
        const res = await api.get("/auth/me");
        setUser(res.data.data.user);
        return res.data.data;
      } catch { return null; }
    } }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) return { role: null, ROLE_META };
  return ctx;
}

export function useAuth() {
  return useRole();
}
