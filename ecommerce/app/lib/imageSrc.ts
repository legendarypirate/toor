/** File in `/public` — safe fallback when URLs are missing or blank */
export const FALLBACK_IMG = '/default.jpg';

/** Never returns an empty string (avoids React / browser warning on `<img src="">`). */
export function safeImgSrc(
  url: string | undefined | null,
  fallback: string = FALLBACK_IMG
): string {
  const u = url == null ? '' : String(url).trim();
  return u.length > 0 ? u : fallback;
}

/** First trimmed non-empty string, otherwise `fallback`. */
export function firstNonEmptyImg(
  ...urls: (string | undefined | null)[]
): string {
  for (const u of urls) {
    const s = u == null ? '' : String(u).trim();
    if (s.length > 0) return s;
  }
  return FALLBACK_IMG;
}

/** Drops blank entries; if nothing left, returns `[fallback]`. */
export function normalizeImageList(
  urls: string[] | undefined | null,
  fallback: string = FALLBACK_IMG
): string[] {
  const out = (urls ?? [])
    .map((u) => (u == null ? '' : String(u).trim()))
    .filter((u): u is string => u.length > 0);
  return out.length > 0 ? out : [fallback];
}
