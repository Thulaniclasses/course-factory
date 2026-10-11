"use client";

import { useEffect, useState } from "react";
import { Cloud, Cpu, AlertCircle, Loader2 } from "lucide-react";

type Provider = {
  mode: string;
  available: boolean;
  message: string;
};

export function ProviderBadge() {
  const [provider, setProvider] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const res = await fetch("/api/provider");
        if (!res.ok) throw new Error("provider check failed");
        const data = (await res.json()) as Provider;
        if (!cancelled) setProvider(data);
      } catch {
        if (!cancelled) {
          setProvider({
            mode: "unknown",
            available: false,
            message: "Unable to determine provider",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    check();
    const interval = setInterval(check, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 12,
          color: "#737373",
          padding: "6px 12px",
          borderRadius: 999,
          background: "#f5f5f5",
          border: "1px solid #e5e5e5",
        }}
      >
        <Loader2 style={{ width: 12, height: 12 }} className="animate-spin" />
        <span>Checking AI...</span>
      </div>
    );
  }

  if (!provider) return null;

  const isLocal = provider.mode === "local" || provider.mode === "hybrid";
  const isHybrid = provider.mode === "hybrid";
  const isHealthy = provider.available;

  // HIGH-CONTRAST colors for light backgrounds
  const style = !isHealthy
    ? { background: "#fee2e2", border: "1px solid #fca5a5", color: "#991b1b" }
    : isLocal
    ? { background: "#d1fae5", border: "1px solid #6ee7b7", color: "#065f46" }
    : { background: "#dbeafe", border: "1px solid #93c5fd", color: "#1e40af" };

  const Icon = !isHealthy ? AlertCircle : isLocal ? Cpu : Cloud;

  const label = !isHealthy
    ? "AI Unavailable"
    : isHybrid
    ? `Hybrid · ${provider.message.replace("Ollama running · ", "")}`
    : isLocal
    ? `Local AI · ${provider.message.replace("Ollama running · ", "")}`
    : "Cloud AI · GPT-4o-mini";

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 12,
        fontWeight: 600,
        padding: "6px 12px",
        borderRadius: 999,
        whiteSpace: "nowrap",
        letterSpacing: "0.01em",
        ...style,
      }}
      title={provider.message}
    >
      <Icon style={{ width: 13, height: 13 }} />
      <span>{label}</span>
    </div>
  );
}
