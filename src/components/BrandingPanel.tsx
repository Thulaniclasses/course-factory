"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Upload, X, Palette } from "lucide-react";
import type { Branding } from "@/lib/branding";
import { BRANDING_PRESETS, resolvePalette, safeColor, websiteHref } from "@/lib/branding";
import type { BrandPalette } from "@/lib/branding";
import { knownBrandForName } from "@/lib/clients";
import { cachedLogoDataUrl } from "@/lib/brandStore";
import { loadLogo } from "@/lib/logo";

interface BrandingPanelProps {
  branding: Branding;
  onChange: (branding: Branding) => void;
  disabled?: boolean;
}

export function BrandingPanel({
  branding,
  onChange,
  disabled,
}: BrandingPanelProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [logoUrlInput, setLogoUrlInput] = useState("");
  const [urlStatus, setUrlStatus] = useState<"" | "loading" | "found" | "miss">("");
  const [logoRev, setLogoRev] = useState(0);
  const [logoCacheReady, setLogoCacheReady] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const brandingRef = useRef(branding);
  const onChangeRef = useRef(onChange);
  const websiteLocked = useRef(false);
  const logoLocked = useRef(false);
  const colorLocked = useRef(false);
  const nameEdited = useRef(false);
  const lookupSeq = useRef(0);
  const paletteSeq = useRef(0);
  brandingRef.current = branding;
  onChangeRef.current = onChange;

  // ---- Preset selection ----
  const applyPreset = (label: string) => {
    const preset = BRANDING_PRESETS.find((p) => p.label === label);
    if (preset) {
      websiteLocked.current = false;
      logoLocked.current = false;
      colorLocked.current = false;
      nameEdited.current = false;
      setUrlStatus("");
      // Preset replaces ALL branding fields, including logo and website
      onChange({
        ...preset.branding,
      });
    }
  };

  // ---- Auto-fill footer when client name changes ----
  const handleClientNameChange = (name: string) => {
    if (name === branding.clientName) return;
    nameEdited.current = true;
    websiteLocked.current = false;
    logoLocked.current = false;
    colorLocked.current = false;
    onChange({
      ...branding,
      clientName: name,
      footerText: name
        ? `© ${new Date().getFullYear()} ${name}. All rights reserved.`
        : branding.footerText,
    });
  };

  // Fill the official website from the company name as it is typed.
  useEffect(() => {
    if (!nameEdited.current || websiteLocked.current) return;
    const name = branding.clientName.trim();
    const seq = ++lookupSeq.current;
    const local = knownBrandForName(name);
    if (local) {
      setUrlStatus("found");
      const current = brandingRef.current;
      const next = {
        ...current,
        websiteUrl: local.websiteUrl,
        primaryColor: local.primaryColor,
        accentColor: local.accentColor,
        darkColor: local.darkColor,
        paperColor: local.paperColor,
        inkColor: local.inkColor,
      };
      if (!logoLocked.current && !current.logoUrl?.startsWith("data:") && local.logoUrl) {
        next.logoUrl = local.logoUrl;
      }
      if (
        next.websiteUrl !== current.websiteUrl ||
        next.logoUrl !== current.logoUrl ||
        next.primaryColor !== current.primaryColor ||
        next.accentColor !== current.accentColor
      ) {
        onChangeRef.current(next);
      }
      return;
    }
    if (name.length < 4) {
      setUrlStatus("");
      const current = brandingRef.current;
      if (current.websiteUrl || (current.logoUrl && !current.logoUrl.startsWith("data:"))) {
        onChangeRef.current({
          ...current,
          websiteUrl: "",
          logoUrl: current.logoUrl?.startsWith("data:") ? current.logoUrl : null,
        });
      }
      return;
    }
    setUrlStatus("loading");
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/company-url?name=${encodeURIComponent(name)}`);
        const data = (await response.json().catch(() => ({}))) as {
          url?: unknown;
          logoUrl?: unknown;
          palette?: BrandPalette | null;
        };
        if (seq !== lookupSeq.current || websiteLocked.current) return;
        if (brandingRef.current.clientName.trim() !== name) return;
        const url = typeof data.url === "string" ? data.url : "";
        const logoUrl = typeof data.logoUrl === "string" ? data.logoUrl : "";
        const current = brandingRef.current;
        if (!url && !data.palette?.primary && !logoUrl) {
          setUrlStatus(current.websiteUrl ? "found" : "miss");
          return;
        }
        const next = { ...current };
        if (url) next.websiteUrl = url;
        if (data.palette?.primary) {
          next.primaryColor = data.palette.primary;
          next.accentColor = data.palette.accent;
          next.darkColor = data.palette.dark;
          next.paperColor = data.palette.paper;
          next.inkColor = data.palette.ink;
        }
        if (logoUrl && !logoLocked.current && !current.logoUrl?.startsWith("data:")) {
          next.logoUrl = logoUrl;
        }
        onChangeRef.current(next);
        setUrlStatus(next.websiteUrl ? "found" : "miss");
      } catch {
        if (seq === lookupSeq.current) {
          setUrlStatus(brandingRef.current.websiteUrl ? "found" : "miss");
        }
      }
    }, 600);
    return () => window.clearTimeout(timer);
  }, [branding.clientName]);

  // Pull the organisation's published colours whenever the website is known.
  useEffect(() => {
    if (colorLocked.current) return;
    const site = websiteHref(branding.websiteUrl);
    if (!site) return;
    const seq = ++paletteSeq.current;
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/company-url?website=${encodeURIComponent(site)}`);
        const data = (await response.json().catch(() => ({}))) as { palette?: BrandPalette | null };
        if (seq !== paletteSeq.current || colorLocked.current) return;
        const palette = data.palette;
        if (!palette?.primary) return;
        const current = brandingRef.current;
        if (
          safeColor(current.primaryColor) === safeColor(palette.primary) &&
          safeColor(current.accentColor) === safeColor(palette.accent)
        ) {
          return;
        }
        onChangeRef.current({
          ...current,
          primaryColor: palette.primary,
          accentColor: palette.accent,
          darkColor: palette.dark,
          paperColor: palette.paper,
          inkColor: palette.ink,
        });
      } catch {
        /* Keep the colours already on the form. */
      }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [branding.websiteUrl]);

  useEffect(() => {
    setLogoCacheReady(true);
  }, []);

  // Download the logo once so documents still carry it after the connection drops.
  useEffect(() => {
    const url = branding.logoUrl;
    if (!url || url.startsWith("data:") || cachedLogoDataUrl(url)) return;
    let cancel = false;
    loadLogo(url).then((logo) => {
      if (!cancel && logo) setLogoRev((n) => n + 1);
    });
    return () => {
      cancel = true;
    };
  }, [branding.logoUrl]);

  // ---- File upload handler ----
  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) {
        alert("Please upload an image file (PNG, JPG, or SVG).");
        return;
      }
      if (file.size > 500_000) {
        alert("Logo must be under 500 KB. Please compress it first.");
        return;
      }
      logoLocked.current = true;
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        onChange({ ...brandingRef.current, logoUrl: dataUrl });
      };
      reader.readAsDataURL(file);
    },
    [branding, onChange]
  );

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const clearLogo = () => {
    logoLocked.current = true;
    onChange({ ...branding, logoUrl: null });
  };

  return (
    <div
      style={{
        background: "var(--card, #171717)",
        border: "1px solid var(--border, #262626)",
        borderRadius: 12,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <label className="cf-label" style={{ margin: 0 }}>
          Client Branding
        </label>
        <span
          style={{
            fontSize: "0.7rem",
            color: "var(--muted)",
            fontStyle: "italic",
          }}
        >
          Optional — appears on all exports
        </span>
      </div>

      {/* Preset dropdown */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "110px 1fr",
          gap: 12,
          alignItems: "center",
        }}
      >
        <label style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
          Preset
        </label>
        <select
          value={
            BRANDING_PRESETS.find(
              (p) => p.branding.clientName === branding.clientName
            )?.label || "Custom"
          }
          onChange={(e) => applyPreset(e.target.value)}
          disabled={disabled}
          className="cf-input"
          style={{ fontSize: "0.85rem", padding: "8px 10px" }}
        >
          {BRANDING_PRESETS.map((p) => (
            <option key={p.label} value={p.label}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      {/* Client name */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "110px 1fr",
          gap: 12,
          alignItems: "center",
        }}
      >
        <label style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
          Client name
        </label>
        <input
          type="text"
          value={branding.clientName}
          onChange={(e) => handleClientNameChange(e.target.value)}
          placeholder="e.g., Egmont Group"
          disabled={disabled}
          className="cf-input"
          style={{ fontSize: "0.85rem", padding: "8px 10px", width: "100%" }}
        />
      </div>

      {/* Official website — filled from the company name */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "110px 1fr",
          gap: 12,
          alignItems: "start",
        }}
      >
        <label style={{ fontSize: "0.8rem", color: "var(--muted)", paddingTop: 8 }}>
          Website
        </label>
        <div>
          <input
            type="url"
            value={branding.websiteUrl || ""}
            onChange={(e) => {
              websiteLocked.current = true;
              nameEdited.current = false;
              setUrlStatus("");
              onChange({ ...branding, websiteUrl: e.target.value });
            }}
            placeholder="Fills in when you type the company name"
            disabled={disabled}
            className="cf-input"
            style={{ fontSize: "0.85rem", padding: "8px 10px", width: "100%" }}
          />
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            {(["primary", "accent", "dark", "paper"] as const).map((key) => {
              const palette = resolvePalette(branding);
              const label = key === "primary" ? "Primary" : key === "accent" ? "Accent" : key === "dark" ? "Dark" : "Paper";
              return (
                <span
                  key={key}
                  title={`${label} ${palette[key]}`}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 4,
                    background: palette[key],
                    border: "1px solid rgba(0,0,0,0.15)",
                    display: "inline-block",
                  }}
                />
              );
            })}
          </div>
          <p style={{ fontSize: "0.7rem", color: "var(--muted)", margin: "6px 0 0" }}>
            {urlStatus === "loading"
              ? "Looking up the official website…"
              : urlStatus === "found"
                ? "Official website filled in from the company name. You can edit it."
                : urlStatus === "miss"
                  ? "No official website found. Paste one if you have it."
                  : "Updates automatically as you write the company name."}
          </p>
        </div>
      </div>
{/* Logo upload */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "110px 1fr",
          gap: 12,
          alignItems: "start",
        }}
      >
        <label
          style={{
            fontSize: "0.8rem",
            color: "var(--muted)",
            paddingTop: 6,
          }}
        >
          Logo
        </label>
        <div>
          {branding.logoUrl ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: 10,
                border: "1px solid var(--border, #262626)",
                borderRadius: 8,
                background: "#0a0a0a",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={logoRev}
                src={
                  (logoCacheReady ? cachedLogoDataUrl(branding.logoUrl) : null) ||
                  branding.logoUrl
                }
                alt="Client logo"
                style={{
                  maxWidth: 60,
                  maxHeight: 40,
                  objectFit: "contain",
                }}
              />
              <span
                style={{
                  fontSize: "0.75rem",
                  color: "var(--muted)",
                  flex: 1,
                }}
              >
                Logo uploaded
              </span>
              <button
                type="button"
                onClick={clearLogo}
                disabled={disabled}
                style={{
                  padding: 4,
                  borderRadius: 4,
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--muted)",
                }}
                title="Remove logo"
              >
                <X style={{ width: 14, height: 14 }} />
              </button>
            </div>
          ) : (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                padding: 14,
                border: `2px dashed ${isDragging ? "var(--green-dark, #10b981)" : "var(--border, #262626)"}`,
                borderRadius: 8,
                textAlign: "center",
                cursor: disabled ? "not-allowed" : "pointer",
                background: isDragging ? "rgba(16,185,129,0.05)" : "transparent",
                transition: "all 0.15s",
              }}
            >
              <Upload
                style={{
                  width: 18,
                  height: 18,
                  margin: "0 auto 6px",
                  color: "var(--muted)",
                }}
              />
              <p
                style={{
                  fontSize: "0.75rem",
                  color: "var(--muted)",
                  margin: 0,
                }}
              >
                Drop a logo or click to upload
              </p>
              <p
                style={{
                  fontSize: "0.65rem",
                  color: "var(--muted)",
                  margin: "4px 0 0",
                  opacity: 0.7,
                }}
              >
                PNG, JPG, or SVG · max 500 KB
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml"
                onChange={handleFileInput}
                style={{ display: "none" }}
              />
            </div>
          )}

          {/* URL option */}
          <div style={{ marginTop: 8 }}>
            <p
              style={{
                fontSize: "0.7rem",
                color: "var(--muted)",
                margin: "0 0 6px",
                textAlign: "center",
              }}
            >
              — or paste a logo URL —
            </p>
            <div style={{ display: "flex", gap: 6 }}>
              <input
                type="url"
                value={logoUrlInput}
                onChange={(e) => setLogoUrlInput(e.target.value)}
                placeholder="Paste a logo URL and click Use URL"
                disabled={disabled}
                className="cf-input"
                style={{
                  fontSize: "0.75rem",
                  padding: "6px 10px",
                  flex: 1,
                }}
              />
              <button
                type="button"
                onClick={() => {
                  const url = logoUrlInput.trim();
                  if (url) {
                    onChange({ ...branding, logoUrl: url });
                    setLogoUrlInput("");
                  }
                }}
                disabled={disabled || !logoUrlInput.trim()}
                className="cf-btn-ghost"
                style={{
                  fontSize: "0.75rem",
                  padding: "6px 12px",
                  whiteSpace: "nowrap",
                }}
              >
                Use URL
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced toggle */}
      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        style={{
          background: "transparent",
          border: "none",
          color: "var(--muted)",
          fontSize: "0.75rem",
          textAlign: "left",
          padding: 0,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <Palette style={{ width: 12, height: 12 }} />
        {showAdvanced ? "Hide advanced options" : "Show advanced options"}
      </button>

      {/* Advanced options */}
      {showAdvanced && (
        <>
          {/* Primary color */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "110px 1fr",
              gap: 12,
              alignItems: "center",
            }}
          >
            <label style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
              Primary color
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="color"
                value={safeColor(branding.primaryColor)}
                onChange={(e) => {
                  colorLocked.current = true;
                  onChange({ ...branding, primaryColor: e.target.value });
                }}
                disabled={disabled}
                style={{
                  width: 40,
                  height: 32,
                  border: "1px solid var(--border, #262626)",
                  borderRadius: 6,
                  background: "transparent",
                  cursor: "pointer",
                }}
              />
              <input
                type="text"
                value={branding.primaryColor}
                onChange={(e) => {
                  colorLocked.current = true;
                  onChange({ ...branding, primaryColor: e.target.value });
                }}
                disabled={disabled}
                className="cf-input"
                style={{
                  fontSize: "0.8rem",
                  padding: "8px 10px",
                  fontFamily: "monospace",
                  flex: 1,
                }}
              />
            </div>
          </div>

          {/* Footer text */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "110px 1fr",
              gap: 12,
              alignItems: "center",
            }}
          >
            <label style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
              Footer text
            </label>
            <input
              type="text"
              value={branding.footerText}
              onChange={(e) =>
                onChange({ ...branding, footerText: e.target.value })
              }
              disabled={disabled}
              className="cf-input"
              style={{ fontSize: "0.8rem", padding: "8px 10px" }}
            />
          </div>
        </>
      )}
    </div>
  );
}
