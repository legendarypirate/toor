/**
 * API base ending in `/api`. Accepts `NEXT_PUBLIC_API_URL` as either
 * `https://host` or `https://host/api` so paths never double up (`/api/api/...`).
 */
export function getApiBase(): string {
  const raw = (process.env.NEXT_PUBLIC_API_URL || "").trim().replace(/\/+$/, "");
  if (!raw) return "http://localhost:3001/api";
  return raw.endsWith("/api") ? raw : `${raw}/api`;
}

/** Origin only (no `/api`), for static `/assets/...` URLs on the API host. */
export function getApiOrigin(): string {
  return getApiBase().replace(/\/api$/, "");
}
