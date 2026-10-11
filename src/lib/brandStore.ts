import { type Branding, DEFAULT_BRANDING } from "./branding";

const BRAND_KEY = "cf.branding";
const LOGO_KEY = "cf.logo-cache";

/** Last branding the user chose, so a refresh or a dropped connection keeps it. */
export function loadSavedBranding(): Branding | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(BRAND_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Branding>;
    if (!parsed || typeof parsed.clientName !== "string" || !parsed.clientName.trim()) return null;
    return {
      clientName: parsed.clientName,
      websiteUrl: typeof parsed.websiteUrl === "string" ? parsed.websiteUrl : "",
      logoUrl: typeof parsed.logoUrl === "string" ? parsed.logoUrl : null,
      primaryColor: parsed.primaryColor || DEFAULT_BRANDING.primaryColor,
      accentColor: parsed.accentColor,
      darkColor: parsed.darkColor,
      paperColor: parsed.paperColor,
      inkColor: parsed.inkColor,
      footerText: typeof parsed.footerText === "string" ? parsed.footerText : "",
    };
  } catch {
    return null;
  }
}

export function saveBranding(branding: Branding): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(BRAND_KEY, JSON.stringify(branding));
  } catch {
    /* Storage can be full or blocked. The in-memory brand still applies. */
  }
}

function readLogoCache(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(LOGO_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Record<string, string>;
  } catch {
    return {};
  }
}

/** A logo already downloaded on this machine, keyed by its original address. */
export function cachedLogoDataUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("data:")) return url;
  const hit = readLogoCache()[url];
  return typeof hit === "string" && hit.startsWith("data:") ? hit : null;
}

export function rememberLogo(url: string, dataUrl: string): void {
  if (typeof window === "undefined") return;
  if (!url || url.startsWith("data:") || !dataUrl.startsWith("data:")) return;
  try {
    const cache = readLogoCache();
    cache[url] = dataUrl;
    const keys = Object.keys(cache).slice(-3);
    const trimmed: Record<string, string> = {};
    for (const key of keys) trimmed[key] = cache[key];
    localStorage.setItem(LOGO_KEY, JSON.stringify(trimmed));
  } catch {
    /* A missing cache only means the next online visit fetches the logo again. */
  }
}
