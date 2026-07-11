import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API_BASE = `${BACKEND_URL}/api`;

// Axios instance with cookie support for auth
export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

export function saveSession(user, token) {
  localStorage.setItem("edusense_user", JSON.stringify(user));
  if (token) localStorage.setItem("edusense_token", token);
}

export function loadSession() {
  const raw = localStorage.getItem("edusense_user");
  if (!raw) return null;
  try {
    const user = JSON.parse(raw);
    return { user, token: localStorage.getItem("edusense_token") || user.id };
  } catch (_e) {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem("edusense_user");
  localStorage.removeItem("edusense_token");
}

// Normalize FastAPI error detail (which may be string, list of objects, or object)
export function formatApiError(err) {
  const detail = err?.response?.data?.detail;
  if (detail == null) return err?.message || "Something went wrong.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e)))
      .filter(Boolean)
      .join(" ");
  }
  if (typeof detail?.msg === "string") return detail.msg;
  return String(detail);
}

export const ROLE_HOME = {
  student: "/student",
  teacher: "/teacher",
  parent: "/parent",
  school_admin: "/school",
  company_admin: "/company",
  government: "/government",
};
