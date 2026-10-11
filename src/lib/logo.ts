import { cachedLogoDataUrl, rememberLogo } from "./brandStore";

export type RasterLogo = {
  data: Uint8Array;
  type: "png" | "jpg" | "gif";
  mime: string;
  /** pptxgenjs form: `image/png;base64,...` */
  dataUri: string;
  width: number;
  height: number;
};

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function mimeToType(mime: string): RasterLogo["type"] | null {
  if (mime.includes("png")) return "png";
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  if (mime.includes("gif")) return "gif";
  return null;
}

async function measure(bytes: Uint8Array, mime: string): Promise<{ width: number; height: number } | null> {
  if (typeof createImageBitmap !== "function") return null;
  try {
    const bitmap = await createImageBitmap(new Blob([bytes as BlobPart], { type: mime }));
    const size = { width: bitmap.width || 160, height: bitmap.height || 64 };
    bitmap.close();
    return size;
  } catch {
    return null;
  }
}

async function rasterize(bytes: Uint8Array, mime: string): Promise<RasterLogo | null> {
  if (typeof document === "undefined") return null;
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: mime }));
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("logo"));
      img.src = url;
    });
    const width = image.naturalWidth || 240;
    const height = image.naturalHeight || 80;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(image, 0, 0, width, height);
    const png = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!png) return null;
    const data = new Uint8Array(await png.arrayBuffer());
    const b64 = bytesToBase64(data);
    return {
      data,
      type: "png",
      mime: "image/png",
      dataUri: `image/png;base64,${b64}`,
      width,
      height,
    };
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function readImageSize(bytes: Uint8Array, mime: string): { width: number; height: number } | null {
  if (mime.includes("png") && bytes.length > 24 && bytes[0] === 0x89) {
    const width = (bytes[16] << 24) | (bytes[17] << 16) | (bytes[18] << 8) | bytes[19];
    const height = (bytes[20] << 24) | (bytes[21] << 16) | (bytes[22] << 8) | bytes[23];
    if (width > 0 && height > 0) return { width, height };
  }
  if ((mime.includes("jpeg") || mime.includes("jpg")) && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let i = 2;
    while (i + 8 < bytes.length) {
      if (bytes[i] !== 0xff) {
        i += 1;
        continue;
      }
      const marker = bytes[i + 1];
      if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
        const height = (bytes[i + 5] << 8) | bytes[i + 6];
        const width = (bytes[i + 7] << 8) | bytes[i + 8];
        if (width > 0 && height > 0) return { width, height };
      }
      const length = (bytes[i + 2] << 8) | bytes[i + 3];
      if (length < 2) break;
      i += 2 + length;
    }
  }
  return null;
}

async function pack(bytes: Uint8Array, mime: string): Promise<RasterLogo | null> {
  const type = mimeToType(mime);
  if (!type) return rasterize(bytes, mime);
  const size = (await measure(bytes, mime)) || readImageSize(bytes, mime) || { width: 160, height: 64 };
  const b64 = bytesToBase64(bytes);
  return {
    data: bytes,
    type,
    mime: type === "jpg" ? "image/jpeg" : `image/${type}`,
    dataUri: `${type === "jpg" ? "image/jpeg" : `image/${type}`};base64,${b64}`,
    width: size.width,
    height: size.height,
  };
}

export function fitBox(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  const safeW = width || maxWidth;
  const safeH = height || maxHeight;
  const scale = Math.min(maxWidth / safeW, maxHeight / safeH);
  return {
    width: Math.max(1, Math.round(safeW * scale)),
    height: Math.max(1, Math.round(safeH * scale)),
  };
}

function fromDataUrl(url: string): Promise<RasterLogo | null> {
  const match = url.match(/^data:([^;,]+)?;base64,(.+)$/);
  if (!match) return Promise.resolve(null);
  return pack(base64ToBytes(match[2]), match[1] || "image/png");
}

/** Load an uploaded data URL, a logo saved on this machine, or a remote logo. */
export async function loadLogo(url: string | null | undefined): Promise<RasterLogo | null> {
  if (!url) return null;
  try {
    if (url.startsWith("data:")) return fromDataUrl(url);
    if (!/^https?:\/\//i.test(url)) return null;
    const cached = cachedLogoDataUrl(url);
    if (cached) return fromDataUrl(cached);
    const response = await fetch(`/api/logo?url=${encodeURIComponent(url)}`);
    if (!response.ok) return cached ? fromDataUrl(cached) : null;
    const body = (await response.json()) as { mime?: string; base64?: string };
    if (!body.base64 || !body.mime?.startsWith("image/")) return cached ? fromDataUrl(cached) : null;
    rememberLogo(url, `data:${body.mime};base64,${body.base64}`);
    return pack(base64ToBytes(body.base64), body.mime);
  } catch {
    const cached = cachedLogoDataUrl(url);
    return cached ? fromDataUrl(cached) : null;
  }
}
