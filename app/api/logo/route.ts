import { NextResponse } from "next/server";

const MAX_BYTES = 900_000;

function isPublicHttp(raw: string): URL | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    host === "localhost" ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host === "0.0.0.0" ||
    host === "::1"
  ) {
    return null;
  }
  if (/^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(host)) return null;
  return url;
}

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("url") || "";
  const target = isPublicHttp(raw);
  if (!target) return NextResponse.json({ error: "Logo URL is not allowed." }, { status: 400 });

  try {
    const response = await fetch(target, {
      redirect: "follow",
      signal: AbortSignal.timeout(6000),
      headers: { accept: "image/*", "user-agent": "CourseFactory/1.0" },
    });
    if (!response.ok) {
      return NextResponse.json({ error: "Logo could not be fetched." }, { status: 502 });
    }
    const mime = (response.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    if (!mime.startsWith("image/")) {
      return NextResponse.json({ error: "URL is not an image." }, { status: 415 });
    }
    const buffer = new Uint8Array(await response.arrayBuffer());
    if (!buffer.byteLength || buffer.byteLength > MAX_BYTES) {
      return NextResponse.json({ error: "Logo must be under 500 KB." }, { status: 413 });
    }
    const finalUrl = response.url ? isPublicHttp(response.url) : target;
    if (!finalUrl) return NextResponse.json({ error: "Logo URL is not allowed." }, { status: 400 });
    return NextResponse.json({ mime, base64: Buffer.from(buffer).toString("base64") });
  } catch {
    return NextResponse.json({ error: "Logo could not be fetched." }, { status: 502 });
  }
}
