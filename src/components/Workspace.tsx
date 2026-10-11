"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, Upload, FileText, X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GeneratedCourse } from "@/lib/ai";
import {
  type CourseSettings,
  type CourseSize,
  type QuizDepth,
  DEFAULT_SETTINGS,
  SIZE_PRESETS,
  QUIZ_DEPTH_PRESETS,
  describeSettings,
} from "@/lib/courseSettings";
import { TEMPLATES, getTemplate } from "@/lib/templates";
import { ProviderBadge } from "./ProviderBadge";
import { BrandingPanel } from "./BrandingPanel";
import { loadSavedBranding, saveBranding } from "@/lib/brandStore";

const LOADING_STAGES = [
  "Analyzing source material...",
  "Extracting key concepts...",
  "Structuring modules...",
  "Designing branching scenarios...",
  "Writing quiz questions...",
  "Finalizing course...",
];

interface WorkspaceProps {
  onCourseGenerated: (course: GeneratedCourse, settings?: CourseSettings) => void;
  onSettingsChange?: (settings: CourseSettings) => void;
  saveError: string | null;
  setSaveError: (err: string | null) => void;
}

export function Workspace({ onCourseGenerated, onSettingsChange, saveError, setSaveError }: WorkspaceProps) {
  const [content, setContent] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingStage, setLoadingStage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<CourseSettings>(DEFAULT_SETTINGS);
  const [templateId, setTemplateId] = useState<string>("custom");
  const skipBrandSave = useRef(true);

  useEffect(() => {
    const saved = loadSavedBranding();
    if (saved) setSettings((current) => ({ ...current, branding: saved }));
  }, []);

  useEffect(() => {
    onSettingsChange?.(settings);
  }, [settings, onSettingsChange]);

  useEffect(() => {
    if (skipBrandSave.current) {
      skipBrandSave.current = false;
      return;
    }
    saveBranding(settings.branding);
  }, [settings.branding]);

  const handleGenerate = async () => {
    if (content.trim().length < 50) return;
    setIsGenerating(true);
    setError(null);
    setLoadingStage(0);

    const stageInterval = setInterval(() => {
      setLoadingStage((prev) =>
        prev < LOADING_STAGES.length - 1 ? prev + 1 : prev
      );
    }, 1500);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceText: content, settings, templateId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate course");
      }

      onCourseGenerated(data.course, settings);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unknown error generating course"
      );
    } finally {
      clearInterval(stageInterval);
      setIsGenerating(false);
    }
  };

  const handleClear = () => {
    setContent("");
    setFileName(null);
    setError(null);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) setFileName(file.name);
  };

  const canGenerate = !isGenerating && content.trim().length >= 50;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", background: "var(--surface)" }}>
      {/* Header */}
      <header style={{
        borderBottom: "1px solid var(--border)",
        padding: "20px 32px",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        background: "white",
      }}>
        <div>
          <h2 style={{ fontSize: "1.15rem", fontWeight: 600, color: "var(--text)", margin: 0 }}>
            Create New Course
          </h2>
          <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginTop: 4, margin: 0 }}>
            Paste your source material. The AI will structure it into a full interactive course.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <ProviderBadge />
          {(content || fileName) && (
            <button onClick={handleClear} className="cf-btn-ghost" style={{ fontSize: "0.8rem" }}>
              <X style={{ width: 14, height: 14 }} />
              Clear
            </button>
          )}
        </div>
      </header>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 32px 32px" }}>
        <div style={{ maxWidth: 780, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Save error banner */}
          {saveError && (
            <div style={{
              display: "flex", alignItems: "flex-start", gap: 12,
              background: "#FEF2F2", border: "1px solid #FECACA",
              borderRadius: 10, padding: 16,
            }}>
              <AlertCircle style={{ width: 18, height: 18, color: "#DC2626", marginTop: 2, flexShrink: 0 }} />
              <div>
                <p style={{ fontWeight: 600, color: "#991B1B", margin: 0, fontSize: "0.85rem" }}>Could not save course</p>
                <p style={{ color: "#B91C1C", marginTop: 4, margin: 0, fontSize: "0.8rem" }}>{saveError}</p>
                <button
                  onClick={() => setSaveError(null)}
                  style={{
                    marginTop: 8, fontSize: "0.75rem", color: "#991B1B",
                    background: "none", border: "none", cursor: "pointer",
                    textDecoration: "underline", padding: 0,
                  }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Error banner */}
          {error && (
            <div style={{
              display: "flex", alignItems: "flex-start", gap: 12,
              background: "#FEF2F2", border: "1px solid #FECACA",
              borderRadius: 10, padding: 16,
            }}>
              <AlertCircle style={{ width: 18, height: 18, color: "#DC2626", marginTop: 2, flexShrink: 0 }} />
              <div>
                <p style={{ fontWeight: 600, color: "#991B1B", margin: 0, fontSize: "0.85rem" }}>Generation failed</p>
                <p style={{ color: "#B91C1C", marginTop: 4, margin: 0, fontSize: "0.8rem" }}>{error}</p>
              </div>
            </div>
          )}

          {/* Drop zone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            className="cf-dropzone"
          >
            {fileName ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "var(--text)" }}>
                <FileText style={{ width: 20, height: 20, color: "var(--green)" }} />
                <span style={{ fontSize: "0.9rem" }}>{fileName}</span>
                <button
                  onClick={() => setFileName(null)}
                  style={{ color: "var(--muted)", background: "none", border: "none", cursor: "pointer", padding: 4 }}
                >
                  <X style={{ width: 16, height: 16 }} />
                </button>
              </div>
            ) : (
              <>
                <Upload className="cf-dropzone-icon" style={{ width: 32, height: 32 }} />
                <p style={{ fontSize: "0.9rem", color: "var(--text)", margin: 0, fontWeight: 500 }}>
                  Drag &amp; drop a PDF, DOCX, or TXT file
                </p>
                <p style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: 6, margin: 0 }}>
                  Or paste your content below
                </p>
              </>
            )}
          </div>

          {/* Source material */}
          <div>
            <label className="cf-label" style={{ display: "block" }}>
              Source Material
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && canGenerate) {
                  e.preventDefault();
                  handleGenerate();
                }
              }}
              placeholder="Paste FATF recommendations, AML regulations, internal SOPs, or any subject matter here... (Ctrl+Enter to generate)"
              className="cf-input"
              style={{ height: 180, resize: "vertical", fontFamily: "inherit", lineHeight: 1.5 }}
              disabled={isGenerating}
            />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
              <p style={{
                fontSize: "0.8rem",
                color: content.length >= 50 ? "var(--green-dark)" : "var(--muted)",
                margin: 0,
              }}>
                {content.length} characters{content.length < 50 && " (min 50)"}
              </p>
              {content.length >= 50 && (
                <span className="cf-badge cf-badge-green">Ready</span>
              )}
            </div>
          </div>

          {/* Template selector */}
          <div
            style={{
              background: "var(--card, #171717)",
              border: "1px solid var(--border, #262626)",
              borderRadius: 12,
              padding: 12,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <label className="cf-label" style={{ margin: 0, fontSize: "0.8rem" }}>
                Course Template
              </label>
              {templateId !== "custom" && (
                <button
                  onClick={() => setTemplateId("custom")}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--muted)",
                    cursor: "pointer",
                    fontSize: "0.7rem",
                    padding: 0,
                  }}
                >
                  Clear
                </button>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "36px 1fr", gap: 10, alignItems: "center" }}>
              <div style={{ fontSize: 20, textAlign: "center" }}>
                {getTemplate(templateId).icon}
              </div>
              <select
                value={templateId}
                onChange={(e) => {
                  const newId = e.target.value;
                  setTemplateId(newId);
                  const tpl = getTemplate(newId);
                  if (tpl.sampleSourceText && content.trim().length < 50) {
                    setContent(tpl.sampleSourceText);
                  }
                }}
                disabled={isGenerating}
                className="cf-input"
                style={{ fontSize: "0.8rem", padding: "6px 8px" }}
              >
                {TEMPLATES.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.icon} {tpl.name}
                  </option>
                ))}
              </select>
            </div>

            <p style={{ fontSize: "0.7rem", color: "var(--muted)", margin: 0 }}>
              {getTemplate(templateId).description}
            </p>

            {templateId !== "custom" && (
              <button
                onClick={() => {
                  const tpl = getTemplate(templateId);
                  if (tpl.sampleSourceText) {
                    setContent(tpl.sampleSourceText);
                  }
                }}
                style={{
                  background: "transparent",
                  border: "1px solid var(--border, #262626)",
                  color: "var(--muted)",
                  cursor: "pointer",
                  fontSize: "0.7rem",
                  padding: "5px 10px",
                  borderRadius: 6,
                  alignSelf: "flex-start",
                }}
              >
                Load sample source text
              </button>
            )}
          </div>

          {/* Course settings */}
          <div
            style={{
              background: "var(--card, #171717)",
              border: "1px solid var(--border, #262626)",
              borderRadius: 12,
              padding: 12,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <label className="cf-label" style={{ margin: 0, fontSize: "0.8rem" }}>
                Course Settings
              </label>
              <span style={{ fontSize: "0.7rem", color: "var(--muted)" }}>
                {describeSettings(settings)}
              </span>
            </div>

            {/* Module size */}
            <div style={{ display: "grid", gridTemplateColumns: "90px 1fr", gap: 10, alignItems: "center" }}>
              <label style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Size</label>
              <select
                value={settings.size}
                onChange={(e) =>
                  setSettings({ ...settings, size: e.target.value as CourseSize })
                }
                disabled={isGenerating}
                className="cf-input"
                style={{ fontSize: "0.85rem", padding: "6px 10px" }}
              >
                <option value="small">{SIZE_PRESETS.small.label} — {SIZE_PRESETS.small.description}</option>
                <option value="medium">{SIZE_PRESETS.medium.label} — {SIZE_PRESETS.medium.description}</option>
                <option value="large">{SIZE_PRESETS.large.label} — {SIZE_PRESETS.large.description}</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            {/* Custom module slider — only when custom */}
            {settings.size === "custom" && (
              <div style={{ display: "grid", gridTemplateColumns: "110px 1fr 40px", gap: 12, alignItems: "center" }}>
                <label style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Modules</label>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={settings.customModules}
                  onChange={(e) =>
                    setSettings({ ...settings, customModules: Number(e.target.value) })
                  }
                  disabled={isGenerating}
                  style={{ width: "100%" }}
                />
                <span style={{ fontSize: "0.85rem", textAlign: "right" }}>
                  {settings.customModules}
                </span>
              </div>
            )}

            {/* Quiz depth */}
            <div style={{ display: "grid", gridTemplateColumns: "90px 1fr", gap: 10, alignItems: "center" }}>
              <label style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Quiz depth</label>
              <select
                value={settings.quizDepth}
                onChange={(e) =>
                  setSettings({ ...settings, quizDepth: e.target.value as QuizDepth })
                }
                disabled={isGenerating}
                className="cf-input"
                style={{ fontSize: "0.85rem", padding: "6px 10px" }}
              >
                <option value="light">{QUIZ_DEPTH_PRESETS.light.label} — {QUIZ_DEPTH_PRESETS.light.description}</option>
                <option value="standard">{QUIZ_DEPTH_PRESETS.standard.label} — {QUIZ_DEPTH_PRESETS.standard.description}</option>
                <option value="heavy">{QUIZ_DEPTH_PRESETS.heavy.label} — {QUIZ_DEPTH_PRESETS.heavy.description}</option>
              </select>
            </div>
          </div>

          {/* Client branding */}
          <BrandingPanel
            branding={settings.branding}
            onChange={(branding) =>
              setSettings((current) => ({ ...current, branding }))
            }
            disabled={isGenerating}
          />

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="cf-btn-primary"
            style={{ width: "100%", padding: "14px 20px", fontSize: "0.95rem" }}
          >
            <Sparkles style={{ width: 18, height: 18 }} className={cn(isGenerating && "animate-pulse")} />
            {isGenerating ? LOADING_STAGES[loadingStage] : "Generate Course"}
          </button>

          {/* Loading bar */}
          {isGenerating && (
            <div className="cf-progress-bar" style={{ width: "100%" }} />
          )}

        </div>
      </div>
    </div>
  );
}
