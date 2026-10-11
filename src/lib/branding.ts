export interface BrandPalette {
  primary: string;
  accent: string;
  dark: string;
  paper: string;
  ink: string;
}

export interface Branding {
  clientName: string;
  /** Official company website. Filled from the client name when it can be matched. */
  websiteUrl: string;
  logoUrl: string | null;
  primaryColor: string;
  /** Second brand colour — bars, highlights, secondary headings. */
  accentColor?: string;
  /** Deep colour for footers and title bands. */
  darkColor?: string;
  /** Page background. */
  paperColor?: string;
  /** Body text. */
  inkColor?: string;
  footerText: string;
}

export const DEFAULT_BRANDING: Branding = {
  clientName: "ECOFEL Certification Program",
  websiteUrl: "https://egmontgroup.org",
  logoUrl: "https://egmontgroup.org/wp-content/themes/egmont/images/ecofel-logo.svg",
  primaryColor: "#0E7C66",
  accentColor: "#C6A15B",
  darkColor: "#0B3D36",
  paperColor: "#F3F7F6",
  inkColor: "#14221F",
  footerText: "© 2026 Egmont Group. All rights reserved.",
};

export const BRANDING_PRESETS: { label: string; branding: Branding }[] = [
  {
    label: "ECOFEL / Egmont Group",
    branding: {
      clientName: "ECOFEL Certification Program",
      websiteUrl: "https://egmontgroup.org",
      logoUrl: "https://egmontgroup.org/wp-content/themes/egmont/images/ecofel-logo.svg",
      primaryColor: "#0E7C66",
      accentColor: "#C6A15B",
      darkColor: "#0B3D36",
      paperColor: "#F3F7F6",
      inkColor: "#14221F",
      footerText: "© 2026 Egmont Group. All rights reserved.",
    },
  },
  {
    label: "BankSETA",
    branding: {
      clientName: "BankSETA LMS",
      websiteUrl: "https://www.bankseta.org.za",
      logoUrl: "https://bankseta.org.za/wp-content/uploads/2024/02/Bankseta-Logo-709x1024.jpg",
      primaryColor: "#AD0049",
      accentColor: "#D9B262",
      darkColor: "#282424",
      paperColor: "#F7F7F7",
      inkColor: "#1A1A1A",
      footerText: "© 2026 BankSETA. All rights reserved.",
    },
  },
  {
    label: "Generic Corporate",
    branding: {
      clientName: "Corporate Training",
      websiteUrl: "",
      logoUrl: null,
      primaryColor: "#4C1D95",
      accentColor: "#D97706",
      darkColor: "#2E1065",
      paperColor: "#F7F5FB",
      inkColor: "#1E1B2E",
      footerText: "Confidential — Internal Use Only",
    },
  },
  {
    label: "Custom",
    branding: DEFAULT_BRANDING,
  },
];

export function safeColor(color: string | undefined): string {
  if (!color) return DEFAULT_BRANDING.primaryColor;
  const trimmed = color.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed;
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    const [_, r, g, b] = trimmed;
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return DEFAULT_BRANDING.primaryColor;
}

/** Six-digit hex without a leading #, safe to embed in Office files. */
export function brandHex(color: string | undefined): string {
  return safeColor(color).slice(1).toUpperCase();
}

/** White on dark brand colours, near-black on light ones. */
export function onBrandText(color: string | undefined): "FFFFFF" | "111827" {
  const h = brandHex(color);
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? "111827" : "FFFFFF";
}

function channel(hex: string, start: number): number {
  return parseInt(brandHex(hex).slice(start, start + 2), 16);
}

function rgb(hex: string): [number, number, number] {
  return [channel(hex, 0), channel(hex, 2), channel(hex, 4)];
}

function toHex(r: number, g: number, b: number): string {
  const byte = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, "0");
  return `#${byte(r)}${byte(g)}${byte(b)}`.toUpperCase();
}

export function mixHex(a: string, b: string, t: number): string {
  const [ar, ag, ab] = rgb(a);
  const [br, bg, bb] = rgb(b);
  const mix = (x: number, y: number) => x + (y - x) * t;
  return toHex(mix(ar, br), mix(ag, bg), mix(ab, bb));
}

function hslToHex(h: number, s: number, l: number): string {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
  };
  return toHex(f(0) * 255, f(8) * 255, f(4) * 255);
}

/** A second colour when the site did not publish one. */
function accentFrom(primary: string): string {
  const [r, g, b] = rgb(primary).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  return hslToHex((h + 36) % 360, Math.max(0.45, s), 0.48);
}

/** Full palette for pages, slides, and documents. Missing colours are derived. */
export function resolvePalette(branding?: Partial<Branding> | null): BrandPalette {
  const primary = safeColor(branding?.primaryColor);
  const accent = branding?.accentColor ? safeColor(branding.accentColor) : accentFrom(primary);
  const dark = branding?.darkColor ? safeColor(branding.darkColor) : mixHex(primary, "#000000", 0.45);
  const paper = branding?.paperColor ? safeColor(branding.paperColor) : mixHex(primary, "#FFFFFF", 0.94);
  const ink = branding?.inkColor ? safeColor(branding.inkColor) : mixHex(dark, "#000000", 0.35);
  return { primary, accent, dark, paper, ink };
}

/** A website address that can be opened. Adds https when the protocol was left off. */
export function websiteHref(raw: string | undefined): string {
  const value = (raw || "").trim();
  if (!value) return "";
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(withProtocol);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    return url.toString();
  } catch {
    return "";
  }
}

export function buildFooter(branding: Branding): string {
  const parts: string[] = [];
  if (branding.clientName) parts.push(branding.clientName);
  if (branding.websiteUrl) parts.push(branding.websiteUrl);
  if (branding.footerText) parts.push(branding.footerText);
  return parts.join(" — ");
}
