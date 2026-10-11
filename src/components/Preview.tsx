"use client";

import { useState } from "react";
import { Copy, Download, Package, Check, FileJson, BookOpen, FileText, Presentation } from "lucide-react";
import type { GeneratedCourse } from "@/lib/ai";

interface PreviewProps {
  course: GeneratedCourse | null;
}

export function Preview({ course }: PreviewProps) {
  const [copied, setCopied] = useState(false);
  const [buildingScorm, setBuildingScorm] = useState(false);
  const [buildingMemo, setBuildingMemo] = useState(false);
  const [buildingPptx, setBuildingPptx] = useState(false);

  const handleCopy = async () => {
    if (!course) return;
    await navigator.clipboard.writeText(JSON.stringify(course, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDownload = () => {
    if (!course) return;
    const blob = new Blob([JSON.stringify(course, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${course.title.replace(/\s+/g, "_").toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleScormExport = async () => {
    if (!course) return;
    setBuildingScorm(true);
    try {
      const { buildScormPackage } = await import("@/lib/scorm");
      await buildScormPackage(course);
    } catch (e) {
      console.error("SCORM export failed", e);
    } finally {
      setBuildingScorm(false);
    }
  };

  const handleMemoExport = async () => {
    if (!course) return;
    setBuildingMemo(true);
    try {
      const { buildMemorandumDocx, downloadDocx } = await import("@/lib/memoDocx");
      const blob = await buildMemorandumDocx(course);
      downloadDocx(blob, course.title);
    } catch (e) {
      console.error("Memo export failed", e);
    } finally {
      setBuildingMemo(false);
    }
  };

  const handlePptxExport = async () => {
    if (!course) return;
    setBuildingPptx(true);
    try {
      const { buildPresentation, downloadPresentation } = await import("@/lib/pptExport");
      const blob = await buildPresentation(course);
      downloadPresentation(blob, course.title);
    } catch (e) {
      console.error("PPTX export failed", e);
    } finally {
      setBuildingPptx(false);
    }
  };

  // ---------- Empty state ----------
  if (!course) {
    return (
      <div
        className="w-96 flex flex-col items-center justify-center p-8 text-center"
        style={{ background: "#FFFFFF", borderLeft: "1px solid #E2E8F0" }}
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: "#F0F7E6" }}
        >
          <BookOpen className="w-6 h-6" style={{ color: "#78BE20" }} />
        </div>
        <p className="text-sm font-medium" style={{ color: "#0F172A" }}>
          No preview yet
        </p>
        <p className="text-xs mt-2" style={{ color: "#64748B" }}>
          Your generated course will appear here.
        </p>
        <p className="text-xs mt-1" style={{ color: "#94A3B8" }}>
          Modules, branching scenarios, and quizzes will render live.
        </p>
      </div>
    );
  }

  // ---------- Course output ----------
  return (
    <div
      className="w-96 flex flex-col h-screen overflow-hidden cf-fade-in"
      style={{ background: "#FFFFFF", borderLeft: "1px solid #E2E8F0" }}
    >
      {/* Header */}
      <div className="p-6" style={{ borderBottom: "1px solid #E2E8F0" }}>
        <span className="cf-badge cf-badge-green mb-3 inline-flex">
          <Check className="w-3 h-3" />
          Course Generated
        </span>
        <h2 className="text-lg font-semibold leading-tight" style={{ color: "#0F172A" }}>
          {course.title}
        </h2>
        {course.description && (
          <p className="text-xs mt-2" style={{ color: "#64748B" }}>
            {course.description}
          </p>
        )}
        <div className="flex items-center gap-3 mt-3">
          <span className="text-[11px]" style={{ color: "#94A3B8" }}>
            {course.modules.length} module{course.modules.length === 1 ? "" : "s"}
          </span>
          <span className="text-[11px]" style={{ color: "#94A3B8" }}>
            ·
          </span>
          <span className="text-[11px]" style={{ color: "#94A3B8" }}>
            {course.modules.reduce((n, m) => n + m.content.length, 0)} cards
          </span>
          <span className="text-[11px]" style={{ color: "#94A3B8" }}>
            ·
          </span>
          <span className="text-[11px]" style={{ color: "#94A3B8" }}>
            {course.modules.reduce((n, m) => n + m.quiz.length, 0)} questions
          </span>
        </div>
      </div>

      {/* Action buttons */}
      <div
        className="flex items-center gap-1.5 px-4 py-3 overflow-x-auto"
        style={{ borderBottom: "1px solid #E2E8F0", background: "#FAFBFC" }}
      >
        <button onClick={handleCopy} className="cf-btn-secondary text-[11px] px-2 py-1.5 flex-1 min-w-0 whitespace-nowrap">
          {copied ? <Check className="w-3 h-3 shrink-0" /> : <Copy className="w-3 h-3 shrink-0" />}
          <span className="truncate">{copied ? "Copied" : "Copy"}</span>
        </button>
        <button onClick={handleDownload} className="cf-btn-secondary text-[11px] px-2 py-1.5 flex-1 min-w-0 whitespace-nowrap">
          <FileJson className="w-3 h-3 shrink-0" />
          <span className="truncate">JSON</span>
        </button>
        <button
          onClick={handleMemoExport}
          disabled={buildingMemo}
          className="cf-btn-secondary text-[11px] px-2 py-1.5 flex-1 min-w-0 whitespace-nowrap"
        >
          <FileText className="w-3 h-3 shrink-0" />
          <span className="truncate">{buildingMemo ? "…" : "Memo"}</span>
        </button>
        <button
          onClick={handleScormExport}
          disabled={buildingScorm}
          className="cf-btn-secondary text-[11px] px-2 py-1.5 flex-1 min-w-0 whitespace-nowrap"
        >
          <Package className="w-3 h-3 shrink-0" />
          <span className="truncate">{buildingScorm ? "…" : "SCORM"}</span>
        </button>
        <button
          onClick={handlePptxExport}
          disabled={buildingPptx}
          className="cf-btn-secondary text-[11px] px-2 py-1.5 flex-1 min-w-0 whitespace-nowrap"
        >
          <Presentation className="w-3 h-3 shrink-0" />
          <span className="truncate">{buildingPptx ? "…" : "PPTX"}</span>
        </button>
      </div>

      {/* Modules */}
      <div className="flex-1 overflow-y-auto p-6">
        {course.modules.map((module, mi) => (
          <div key={module.id || mi} className="cf-card">
            <div className="flex items-start gap-3 mb-4">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-semibold"
                style={{ background: "#E6EEF7", color: "#003366" }}
              >
                {mi + 1}
              </div>
              <h3 className="text-sm font-semibold leading-tight" style={{ color: "#0F172A" }}>
                {module.title}
              </h3>
            </div>

            {/* Content cards */}
            {module.content.length > 0 && (
              <div className="space-y-2 mb-4">
                {module.content.map((card, ci) => (
                  <div
                    key={ci}
                    className="text-xs leading-relaxed pl-3 py-1"
                    style={{ color: "#334155", borderLeft: "3px solid #D3E8B5" }}
                  >
                    {card}
                  </div>
                ))}
              </div>
            )}

            {/* Scenario */}
            {module.scenario && module.scenario.options.length > 0 && (
              <div className="mb-4">
                <p className="cf-label mb-2">Branching Scenario</p>
                <div
                  className="rounded-lg p-3 mb-3"
                  style={{ background: "#F8FAFC", border: "1px solid #E2E8F0" }}
                >
                  <p className="text-xs font-medium" style={{ color: "#0F172A" }}>
                    {module.scenario.prompt}
                  </p>
                </div>
                <div className="space-y-2">
                  {module.scenario.options.map((opt) => (
                    <div
                      key={opt.id}
                      className="rounded-lg p-3 transition-colors"
                      style={
                        opt.isCorrect
                          ? { background: "#F0F7E6", border: "1px solid #D3E8B5" }
                          : { background: "#FFFFFF", border: "1px solid #E2E8F0" }
                      }
                    >
                      <div className="flex items-start gap-2">
                        <span
                          className="text-xs font-mono shrink-0 mt-0.5 w-6"
                          style={{ color: opt.isCorrect ? "#4B7A14" : "#94A3B8" }}
                        >
                          {opt.id.toUpperCase()}.&nbsp;{opt.isCorrect ? "✓" : "○"}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs" style={{ color: "#334155" }}>
                            {opt.text}
                          </p>
                          {opt.isCorrect && opt.feedback && (
                            <p className="text-[11px] mt-1" style={{ color: "#4B7A14" }}>
                              {opt.feedback}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quiz */}
            {module.quiz.length > 0 && (
              <div>
                <p className="cf-label mb-2">
                  Quiz ({module.quiz.length} question{module.quiz.length === 1 ? "" : "s"})
                </p>
                <div className="space-y-3">
                  {module.quiz.map((q, qi) => (
                    <div key={qi}>
                      <p className="text-xs font-medium mb-2" style={{ color: "#0F172A" }}>
                        {qi + 1}. {q.question}
                      </p>
                      <div className="space-y-1">
                        {q.options.map((opt, oi) => (
                          <div
                            key={oi}
                            className="text-[11px] flex items-center gap-2"
                            style={{ color: oi === q.correctIndex ? "#4B7A14" : "#64748B" }}
                          >
                            <span className="font-mono w-6 shrink-0">
                              {String.fromCharCode(65 + oi)}.&nbsp;{oi === q.correctIndex ? "✓" : "○"}
                            </span>
                            <span>{opt}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
