import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api",
});

// 2-tier role header — beekeeper (steps 1-2) vs kvic (steps 3-8). Stored in localStorage.
api.interceptors.request.use((config) => {
  try {
    const role = localStorage.getItem("honey_role");
    if (role) config.headers["x-role"] = role;
  } catch {}
  return config;
});

export default api;
