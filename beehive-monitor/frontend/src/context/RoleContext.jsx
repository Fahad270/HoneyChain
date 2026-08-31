import { createContext, useContext, useEffect, useState } from "react";

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

export function RoleProvider({ children }) {
  const [role, setRoleState] = useState(() => {
    try { return localStorage.getItem("honey_role") || "beekeeper"; } catch { return "beekeeper"; }
  });

  function setRole(r) {
    const v = r === "kvic" ? "kvic" : "beekeeper";
    try { localStorage.setItem("honey_role", v); } catch {}
    setRoleState(v);
  }

  useEffect(() => {
    try { localStorage.setItem("honey_role", role); } catch {}
  }, [role]);

  return <RoleContext.Provider value={{ role, setRole, ROLE_META }}>{children}</RoleContext.Provider>;
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) return { role: "beekeeper", setRole: () => {}, ROLE_META };
  return ctx;
}
