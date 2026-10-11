import { NextResponse } from "next/server";
import { lookupCompanyBrand, lookupSiteBrand, normalizeWebsite } from "@/lib/companyLookup";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const name = params.get("name")?.trim() || "";
  const website = params.get("website")?.trim() || "";
  if (website) {
    const url = normalizeWebsite(website);
    const site = url ? await lookupSiteBrand(url) : { logoUrl: null, palette: null };
    return NextResponse.json({ url: url || null, logoUrl: site.logoUrl, palette: site.palette });
  }
  if (name.length < 3 || name.length > 120) {
    return NextResponse.json({ url: null, logoUrl: null, palette: null });
  }
  const brand = await lookupCompanyBrand(name);
  return NextResponse.json(brand);
}
