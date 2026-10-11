/**
 * Looks up a company's official website from Wikidata (property P856)
 * and the colour system published on that website.
 * Used when the typed name is not already in the local client catalogue.
 */

import { type BrandPalette, mixHex, safeColor } from "./branding";

const BLOCKED_HOSTS = [
  "facebook.com",
  "fb.com",
  "instagram.com",
  "twitter.com",
  "x.com",
  "linkedin.com",
  "youtube.com",
  "youtu.be",
  "tiktok.com",
  "wikipedia.org",
  "wikidata.org",
  "wikimedia.org",
];

const cache = new Map<
  string,
  { url: string | null; logoUrl: string | null; palette: BrandPalette | null; at: number }
>();
const CACHE_MS = 10 * 60 * 1000;

type SearchHit = { id?: string; label?: string };
type UrlClaim = { rank?: string; mainsnak?: { datavalue?: { value?: unknown } } };

function hostBlocked(hostname: string): boolean {
  const host = hostname.replace(/^www\./, "").toLowerCase();
  return BLOCKED_HOSTS.some((blocked) => host === blocked || host.endsWith(`.${blocked}`));
}

export function normalizeWebsite(raw: string): string {
  let value = raw.trim();
  if (!value) return "";
  if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    if (hostBlocked(url.hostname)) return "";
    url.protocol = "https:";
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function labelsMatch(query: string, label: string): boolean {
  const a = query.toLowerCase().replace(/\s+/g, " ").trim();
  const b = label.toLowerCase().replace(/\s+/g, " ").trim();
  if (!a || !b) return false;
  if (a === b || b.startsWith(a) || a.startsWith(b)) return true;
  const aTokens = a.split(" ").filter((word) => word.length > 2);
  const bTokens = new Set(b.split(" ").filter((word) => word.length > 2));
  if (!aTokens.length) return false;
  const overlap = aTokens.filter((word) => bTokens.has(word)).length;
  return overlap >= Math.min(aTokens.length, bTokens.size) && overlap > 0;
}

function scoreUrl(url: string, name: string): number {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    const nameSlug = slug(name);
    const hostSlug = slug(host);
    let score = 0;
    if (nameSlug.length >= 4 && (hostSlug.includes(nameSlug) || nameSlug.includes(hostSlug))) {
      score += 8;
    } else if (nameSlug.length >= 4 && hostSlug.includes(nameSlug.slice(0, 6))) {
      score += 4;
    }
    if (parsed.pathname === "/" || parsed.pathname === "") score += 2;
    score += Math.max(0, 24 - host.length) / 8;
    return score;
  } catch {
    return -1;
  }
}

function claimUrl(claim: UrlClaim): string {
  const value = claim.mainsnak?.datavalue?.value;
  return typeof value === "string" ? normalizeWebsite(value) : "";
}

async function wikidata(params: Record<string, string>): Promise<unknown> {
  const url = new URL("https://www.wikidata.org/w/api.php");
  url.searchParams.set("format", "json");
  url.searchParams.set("origin", "*");
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "user-agent": "CourseFactory/1.0 (local branding lookup)",
    },
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error(`Wikidata ${response.status}`);
  return response.json();
}

function isPublicHttpUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    if (host === "localhost" || host.endsWith(".local") || host === "0.0.0.0" || host === "::1") return false;
    if (/^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(host)) return false;
    return true;
  } catch {
    return false;
  }
}

function absoluteUrl(base: string, href: string): string {
  try {
    return new URL(href, base).toString();
  } catch {
    return "";
  }
}

type LogoCandidate = { url: string; score: number };

function collectLogoCandidates(html: string, pageUrl: string): LogoCandidate[] {
  const found: LogoCandidate[] = [];
  const push = (href: string | undefined, score: number) => {
    if (!href) return;
    const url = absoluteUrl(pageUrl, href.trim());
    if (!isPublicHttpUrl(url)) return;
    if (/banner|slider|hero|poster|favicon\.ico/i.test(url)) score -= 12;
    found.push({ url, score });
  };

  const ld = html.match(/"logo"\s*:\s*\{[^}]{0,400}?"url"\s*:\s*"([^"]+)"/i);
  push(ld?.[1], 16);
  const ldString = html.match(/"logo"\s*:\s*"(https?:[^"]+)"/i);
  push(ldString?.[1], 15);

  for (const tag of html.matchAll(/<link\b[^>]*>/gi)) {
    const rel = /rel=["']([^"']+)["']/i.exec(tag[0])?.[1] || "";
    const href = /href=["']([^"']+)["']/i.exec(tag[0])?.[1];
    if (!href) continue;
    if (/apple-touch-icon/i.test(rel)) {
      const size = Number(/sizes=["'](\d+)/i.exec(tag[0])?.[1] || 120);
      push(href, 18 + Math.min(size, 180) / 90);
    } else if (/\bicon\b/i.test(rel) && /logo/i.test(href)) {
      push(href, 14);
    }
  }

  const header = html.match(/<header\b[\s\S]*?<\/header>/i)?.[0] || "";
  for (const img of header.matchAll(/<img\b[^>]*>/gi)) {
    const src = /src=["']([^"']+)["']/i.exec(img[0])?.[1];
    const blob = `${src || ""} ${/alt=["']([^"']*)["']/i.exec(img[0])?.[1] || ""} ${/class=["']([^"']*)["']/i.exec(img[0])?.[1] || ""}`;
    if (/logo|brand/i.test(blob)) push(src, 24);
  }

  found.sort((a, b) => b.score - a.score);
  const seen = new Set<string>();
  return found.filter((item) => {
    if (seen.has(item.url) || item.score < 8) return false;
    seen.add(item.url);
    return true;
  });
}

async function imageIsUsable(url: string): Promise<boolean> {
  if (!isPublicHttpUrl(url)) return false;
  try {
    const response = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(5000),
      headers: { "user-agent": "Mozilla/5.0 CourseFactory/1.0" },
    });
    if (!response.ok) return false;
    if (!isPublicHttpUrl(response.url || url)) return false;
    const mime = (response.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    const length = Number(response.headers.get("content-length") || 0);
    if (length > 900_000) return false;
    if (mime.startsWith("image/")) return true;
    return /\.(png|jpe?g|gif|svg|webp)(\?|$)/i.test(new URL(response.url || url).pathname);
  } catch {
    return false;
  }
}

function normalizeHex(raw: string): string {
  const trimmed = raw.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed.toUpperCase();
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    const [, r, g, b] = trimmed;
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  return "";
}

function saturation(hex: string): number {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === 0) return 0;
  return (max - min) / max;
}

function luminanceOf(hex: string): number {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function namedColor(vars: Map<string, string>, keys: string[]): string {
  for (const key of keys) {
    const value = vars.get(key);
    if (value) return value;
  }
  return "";
}

/** Read a brand palette from homepage HTML and its stylesheets. */
export function extractPalette(html: string, stylesheets: string[]): BrandPalette | null {
  const vars = new Map<string, string>();
  const counts = new Map<string, number>();
  const sources = [html, ...stylesheets];
  for (const source of sources) {
    for (const match of source.matchAll(/--([a-zA-Z0-9_-]+)\s*:\s*(#[0-9a-fA-F]{3,8})/g)) {
      const hex = normalizeHex(match[2]);
      if (hex) vars.set(match[1].toLowerCase(), hex);
    }
    for (const match of source.matchAll(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g)) {
      const hex = normalizeHex(`#${match[1]}`);
      if (!hex) continue;
      counts.set(hex, (counts.get(hex) || 0) + 1);
    }
  }

  const theme = html.match(
    /<meta[^>]+name=["']theme-color["'][^>]+content=["'](#[0-9a-fA-F]{3,8})["']/i
  );
  const themeColor = theme ? normalizeHex(theme[1]) : "";
  const tailwind = html.match(/primary["']?\s*:\s*["'](#[0-9a-fA-F]{3,8})["']/i);
  const tailwindPrimary = tailwind ? normalizeHex(tailwind[1]) : "";

  const primary =
    namedColor(vars, [
      "e-global-color-primary",
      "primary",
      "brand",
      "brand-primary",
      "color-primary",
      "wp--preset--color--primary",
    ]) ||
    themeColor ||
    tailwindPrimary;

  const accent = namedColor(vars, [
    "e-global-color-secondary",
    "e-global-color-accent",
    "accent",
    "secondary",
    "brand-accent",
    "wp--preset--color--secondary",
  ]);

  const inkNamed = namedColor(vars, ["e-global-color-text", "text", "ink", "body-color"]);

  const saturated = [...counts.entries()]
    .filter(([hex, count]) => count >= 2 && saturation(hex) >= 0.28)
    .filter(([hex]) => {
      const lum = luminanceOf(hex);
      return lum > 0.08 && lum < 0.82;
    })
    .sort((a, b) => b[1] - a[1]);

  const chosenPrimary = primary || saturated[0]?.[0] || "";
  if (!chosenPrimary) return null;

  const chosenAccent =
    accent ||
    saturated.find(([hex]) => hex !== chosenPrimary.toUpperCase() && saturation(hex) >= 0.28)?.[0] ||
    "";

  const dark =
    [...counts.entries()]
      .filter(([hex, count]) => count >= 2 && luminanceOf(hex) < 0.18 && luminanceOf(hex) > 0.02)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || mixHex(chosenPrimary, "#000000", 0.45);

  const paper =
    [...counts.entries()]
      .filter(([hex, count]) => count >= 2 && luminanceOf(hex) > 0.93 && saturation(hex) < 0.08)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || mixHex(chosenPrimary, "#FFFFFF", 0.94);

  return {
    primary: safeColor(chosenPrimary),
    accent: chosenAccent ? safeColor(chosenAccent) : mixHex(chosenPrimary, "#FFFFFF", 0.35),
    dark: safeColor(dark),
    paper: safeColor(paper),
    ink: inkNamed && luminanceOf(inkNamed) < 0.35 ? safeColor(inkNamed) : safeColor(mixHex(dark, "#000000", 0.25)),
  };
}

async function readStylesheets(html: string, pageUrl: string): Promise<string[]> {
  let origin = "";
  try {
    origin = new URL(pageUrl).origin;
  } catch {
    return [];
  }
  const hrefs = [...html.matchAll(/<link[^>]+href=["']([^"']+\.css[^"']*)["']/gi)]
    .map((match) => absoluteUrl(pageUrl, match[1]))
    .filter((href) => {
      try {
        const url = new URL(href);
        if (url.origin !== origin) return false;
        const path = url.pathname.toLowerCase();
        if (path.includes("font-awesome") || path.includes("fonts") || path.includes("embedpress")) return false;
        return true;
      } catch {
        return false;
      }
    });
  const preferred = [
    ...hrefs.filter((href) => /elementor|theme|global|main|style/i.test(href)),
    ...hrefs,
  ];
  const unique = [...new Set(preferred)].slice(0, 4);
  const sheets: string[] = [];
  for (const href of unique) {
    try {
      const response = await fetch(href, {
        signal: AbortSignal.timeout(6000),
        headers: { "user-agent": "Mozilla/5.0 CourseFactory/1.0" },
      });
      if (!response.ok) continue;
      sheets.push((await response.text()).slice(0, 180_000));
    } catch {
      continue;
    }
  }
  return sheets;
}

/** Logo and colour system from a company's homepage. */
export async function lookupSiteBrand(
  website: string
): Promise<{ logoUrl: string | null; palette: BrandPalette | null }> {
  const page = normalizeWebsite(website);
  if (!page || !isPublicHttpUrl(page)) return { logoUrl: null, palette: null };
  try {
    const response = await fetch(page, {
      redirect: "follow",
      signal: AbortSignal.timeout(7000),
      headers: {
        accept: "text/html",
        "user-agent": "Mozilla/5.0 CourseFactory/1.0",
      },
    });
    if (!response.ok || !isPublicHttpUrl(response.url || page)) {
      return { logoUrl: null, palette: null };
    }
    const finalUrl = response.url || page;
    const html = (await response.text()).slice(0, 500_000);
    const stylesheets = await readStylesheets(html, finalUrl);
    const palette = extractPalette(html, stylesheets);
    const candidates = collectLogoCandidates(html, finalUrl);
    let logoUrl: string | null = null;
    for (const candidate of candidates.slice(0, 6)) {
      if (await imageIsUsable(candidate.url)) {
        logoUrl = candidate.url;
        break;
      }
    }
    return { logoUrl, palette };
  } catch {
    return { logoUrl: null, palette: null };
  }
}

/** Logo image from a company's homepage: header mark, then apple-touch icon. */
export async function lookupLogoForWebsite(website: string): Promise<string | null> {
  return (await lookupSiteBrand(website)).logoUrl;
}

export async function lookupCompanyWebsite(name: string): Promise<string | null> {
  const brand = await lookupCompanyBrand(name);
  return brand.url;
}

export async function lookupCompanyBrand(
  name: string
): Promise<{ url: string | null; logoUrl: string | null; palette: BrandPalette | null }> {
  const query = name.trim().replace(/\s+/g, " ");
  if (query.length < 3) return { url: null, logoUrl: null, palette: null };
  const key = query.toLowerCase();
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < CACHE_MS) {
    return { url: cached.url, logoUrl: cached.logoUrl, palette: cached.palette };
  }

  let url: string | null = null;
  try {
    const search = (await wikidata({
      action: "wbsearchentities",
      search: query,
      language: "en",
      limit: "5",
    })) as { search?: SearchHit[] };

    const hits = (search.search || [])
      .filter((hit) => hit.id && hit.label && labelsMatch(query, hit.label))
      .sort((a, b) => {
        const aExact = a.label?.toLowerCase() === key ? 0 : 1;
        const bExact = b.label?.toLowerCase() === key ? 0 : 1;
        if (aExact !== bExact) return aExact - bExact;
        return (a.label?.length || 99) - (b.label?.length || 99);
      })
      .slice(0, 2);

    if (hits.length) {
      const entities = (await wikidata({
        action: "wbgetentities",
        ids: hits.map((hit) => hit.id).join("|"),
        props: "claims",
      })) as {
        entities?: Record<string, { claims?: { P856?: UrlClaim[] } }>;
      };

      let best = "";
      let bestScore = -1;
      for (const hit of hits) {
        const claims = entities.entities?.[hit.id || ""]?.claims?.P856 || [];
        const ranked = [...claims].sort((a, b) => {
          const weight = (rank?: string) => (rank === "preferred" ? 0 : rank === "normal" ? 1 : 2);
          return weight(a.rank) - weight(b.rank);
        });
        for (const claim of ranked) {
          if (claim.rank === "deprecated") continue;
          const candidate = claimUrl(claim);
          const score = scoreUrl(candidate, query);
          if (candidate && score > bestScore) {
            best = candidate;
            bestScore = score;
          }
        }
      }
      url = best || null;
    }
  } catch {
    url = null;
  }

  const site = url ? await lookupSiteBrand(url) : { logoUrl: null, palette: null };
  cache.set(key, { url, logoUrl: site.logoUrl, palette: site.palette, at: Date.now() });
  return { url, logoUrl: site.logoUrl, palette: site.palette };
}
