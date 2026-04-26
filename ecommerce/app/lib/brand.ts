/** Storefront display branding */
export const BRAND_NAME = "TOOR.MN";
export const BRAND_NAME_SHORT = "TOOR.MN";

/** Default logo served from `public/toor_logo.png` */
export const STOREFRONT_LOGO_PATH = "/toor_logo.png";

/**
 * API/DB may still point at the old logo file. Map those to the current asset.
 * Other URLs (e.g. admin-uploaded images) are left as-is.
 */
export function publicLogoUrl(url?: string | null): string {
  const u = url == null ? "" : String(url).trim();
  if (!u) return STOREFRONT_LOGO_PATH;
  if (/logotsas|tsaas/i.test(u)) return STOREFRONT_LOGO_PATH;
  return u;
}

/** Header/footer always show the storefront asset (API footer logo is ignored for `<img src>`). */
export function storefrontLogoSrc(): string {
  return STOREFRONT_LOGO_PATH;
}

const LEGACY_BRAND_RE = /(tsaas|outdoor\s*world)/i;

/** API/DB may still store the old name; always show current brand in the storefront. */
export function publicBrandName(apiName?: string | null): string {
  if (apiName == null || String(apiName).trim() === "") return BRAND_NAME;
  if (LEGACY_BRAND_RE.test(apiName)) return BRAND_NAME;
  return String(apiName).trim();
}

/** Copyright line: replace legacy name in stored text. */
export function publicCopyrightText(text?: string | null): string {
  const y = new Date().getFullYear();
  const fallback = `© ${y} ${BRAND_NAME}. Бүх эрх хуулиар хамгаалагдсан.`;
  if (text == null || String(text).trim() === "") return fallback;
  if (LEGACY_BRAND_RE.test(text)) {
    return String(text)
      .replace(/Tsaas\.mn/gi, BRAND_NAME)
      .replace(/tsaas\.mn/gi, BRAND_NAME)
      .replace(/outdoor world/gi, BRAND_NAME);
  }
  return String(text);
}

/** Contact email shown in footer when API still has legacy domain. */
export function publicContactEmail(email?: string | null): string {
  const fallback = "info@outdoorworld.mn";
  if (email == null || String(email).trim() === "") return fallback;
  if (LEGACY_BRAND_RE.test(email)) {
    return String(email).replace(/@tsaas\.mn/gi, "@outdoorworld.mn");
  }
  return String(email).trim();
}

/** Old default footer blurb from previous business; DB may still store it. */
const LEGACY_FOOTER_DESCRIPTION =
  "ПОСЫН ЦААС БӨӨНИЙ ХУДАЛДАА, КАССЫН ТОНОГ ТӨХӨӨРӨМЖИЙН ТӨВ";

/** Tagline shown in footer when replacing legacy description or as fallback copy. */
export const FOOTER_TAGLINE = "Аялалын бүх үйлчилгээ нэг дор";

/** Map stored API/DB footer description to what the storefront should show. */
export function publicFooterDescription(desc?: string | null): string {
  const t = desc == null ? "" : String(desc).trim();
  if (!t) return "";
  if (t === LEGACY_FOOTER_DESCRIPTION) return FOOTER_TAGLINE;
  return t;
}
