import type { Branding } from "./branding";

export interface ClientProfile {
  id: string;
  name: string;         // display name for search
  aliases: string[];    // alternate names users might type
  branding: Branding;
}

export const CLIENT_PROFILES: ClientProfile[] = [
  {
    id: "egmont",
    name: "Egmont Group",
    aliases: [
      "egmont",
      "ecofel",
      "ecofel certification program",
      "egmont group",
      "financial intelligence units",
      "fiu",
    ],
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
    id: "bankseta",
    name: "BankSETA",
    aliases: ["bankseta", "bankseta lms", "bank seta"],
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
    id: "own-business",
    name: "Your Business",
    aliases: [
      "thulani",
      "thulani dlamini",
      "td consulting",
      "my company",
    ],
    branding: {
      clientName: "Thulani Dlamini Consulting",
      websiteUrl: "",
      logoUrl: null,
      primaryColor: "#6d28d9",
      footerText: "© 2026 Thulani Dlamini Consulting. All rights reserved.",
    },
  },
  {
    id: "generic",
    name: "Generic Corporate",
    aliases: ["generic", "corporate", "corporate training"],
    branding: {
      clientName: "Corporate Training",
      websiteUrl: "",
      logoUrl: null,
      primaryColor: "#6d28d9",
      footerText: "Confidential — Internal Use Only",
    },
  },
];

/**
 * Search for client profiles matching a query string.
 * Matches against name + aliases.
 */
export function searchClients(query: string): ClientProfile[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return CLIENT_PROFILES.filter((c) => {
    if (c.name.toLowerCase().includes(q)) return true;
    return c.aliases.some((a) => a.toLowerCase().includes(q));
  });
}

/**
 * Find a client profile by exact name match.
 */
export function findClientByName(name: string): ClientProfile | undefined {
  const q = name.trim().toLowerCase();
  if (!q) return undefined;
  return CLIENT_PROFILES.find(
    (c) =>
      c.name.toLowerCase() === q ||
      c.branding.clientName.toLowerCase() === q ||
      c.aliases.some((a) => a.toLowerCase() === q)
  );
}

/**
 * Official website for a name the user is still typing.
 * Exact names win. A single strong prefix match is used once three characters are in.
 */
export function knownBrandForName(name: string): {
  websiteUrl: string;
  logoUrl: string | null;
  primaryColor: string;
  accentColor?: string;
  darkColor?: string;
  paperColor?: string;
  inkColor?: string;
} | null {
  const exact = findClientByName(name);
  if (exact?.branding.websiteUrl) {
    return {
      websiteUrl: exact.branding.websiteUrl,
      logoUrl: exact.branding.logoUrl,
      primaryColor: exact.branding.primaryColor,
      accentColor: exact.branding.accentColor,
      darkColor: exact.branding.darkColor,
      paperColor: exact.branding.paperColor,
      inkColor: exact.branding.inkColor,
    };
  }
  const q = name.trim().toLowerCase();
  if (q.length < 3) return null;
  const hits = searchClients(q).filter((c) => c.branding.websiteUrl);
  const strong = hits.filter((c) => {
    const fields = [c.name, c.branding.clientName, ...c.aliases].map((s) =>
      s.toLowerCase()
    );
    return fields.some(
      (field) => field.startsWith(q) || (q.startsWith(field) && field.length >= 4)
    );
  });
  const urls = [...new Set(strong.map((c) => c.branding.websiteUrl))];
  if (urls.length === 1 && urls[0]) {
    const branding = strong[0].branding;
    return {
      websiteUrl: urls[0],
      logoUrl: branding.logoUrl,
      primaryColor: branding.primaryColor,
      accentColor: branding.accentColor,
      darkColor: branding.darkColor,
      paperColor: branding.paperColor,
      inkColor: branding.inkColor,
    };
  }
  return null;
}

export function websiteForCompanyName(name: string): string | null {
  return knownBrandForName(name)?.websiteUrl ?? null;
}
