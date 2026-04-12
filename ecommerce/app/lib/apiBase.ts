/**
 * Public API base (…/api). Supports NEXT_PUBLIC_API_URL as either
 * `http://host:port` or `http://host:port/api`.
 */
export function getPublicApiBase(): string {
  const raw = (process.env.NEXT_PUBLIC_API_URL || "").trim().replace(/\/+$/, "");
  if (!raw) return "http://localhost:3001/api";
  return raw.endsWith("/api") ? raw : `${raw}/api`;
}
