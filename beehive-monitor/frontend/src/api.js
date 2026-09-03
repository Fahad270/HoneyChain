import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api",
});

// Auth: Bearer JWT when logged in — the ONLY thing that grants a tier.
// The legacy x-role header is sent purely as a read-label hint and grants
// nothing server-side.
api.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem("honey_token");
    if (token) config.headers["Authorization"] = `Bearer ${token}`;
    const userRaw = localStorage.getItem("honey_user");
    const role = userRaw ? JSON.parse(userRaw)?.role : null;
    if (role) config.headers["x-role"] = role;
  } catch {}
  return config;
});

// A dead session shouldn't strand the UI in a fake logged-in state. Only the
// /auth/me probe triggers cleanup — other endpoints 401 for their own reasons
// (e.g. wrong OTP must NOT log you out).
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401 && String(err?.config?.url || "").includes("/auth/me")) {
      try {
        localStorage.removeItem("honey_token");
        localStorage.removeItem("honey_user");
      } catch {}
    }
    return Promise.reject(err);
  }
);

export default api;
