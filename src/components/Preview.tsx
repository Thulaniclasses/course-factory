"use client";

import { Eye, Layers, Check, X, Save, RotateCcw, Loader2, Copy, FileJson, Package, FileText, Presentation, FileType } from "lucide-react";
import { cn } from "@/lib/utils";
import { EditableText } from "./EditableText";
import type { GeneratedCourse } from "@/lib/ai";
import { resolvePalette, websiteHref } from "@/lib/branding";
import { downloadMemo } from "@/lib/memo";
import { downloadPptx } from "@/lib/pptx";
import { downloadDocx } from "@/lib/docx";
import { useState } from "react";

interface PreviewProps {
  course: GeneratedCourse | null;
  branding?: import("@/lib/branding").Branding;
  isDirty?: boolean;
  justSaved?: boolean;
  onUpdateModuleTitle?: (mi: number, v: string) => void;
  onUpdateCard?: (mi: number, ci: number, v: string) => void;
  onUpdateScenario?: (mi: number, field: "prompt", v: string) => void;
  onUpdateScenarioOption?: (
    mi: number,
    oi: number,
    field: "text" | "feedback",
    v: string
  ) => void;
  onUpdateQuizQuestion?: (mi: number, qi: number, v: string) => void;
  onUpdateQuizOption?: (mi: number, qi: number, oi: number, v: string) => void;
  onSave?: () => void;
  onDiscard?: () => void;
}

export function Preview({
  course,
  branding,
  isDirty = false,
  justSaved = false,
  onUpdateModuleTitle,
  onUpdateCard,
  onUpdateScenario,
  onUpdateScenarioOption,
  onUpdateQuizQuestion,
  onUpdateQuizOption,
  onSave,
  onDiscard,
}: PreviewProps) {
  if (!course) {
    return (
      <div className="w-[420px] h-screen bg-white border-l border-neutral-200 flex flex-col">
        <header className="border-b border-neutral-200 px-6 py-5">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-neutral-600" />
            <h3 className="text-sm font-semibold text-neutral-900">Live Preview</h3>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <Layers className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
            <p className="text-sm text-neutral-500">
              Your generated course will appear here.
            </p>
            <p className="text-xs text-neutral-700 mt-2">
              Modules, branching scenarios, and quizzes will render live.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const site = websiteHref(branding?.websiteUrl);
  const palette = resolvePalette(branding);

  return (
    <div className="w-[420px] h-screen bg-white border-l border-neutral-200 flex flex-col relative">
      {/* Header + Save/Discard toolbar */}
      <header className="border-b border-neutral-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-neutral-600" />
          <h3 className="text-sm font-semibold text-neutral-900">Live Preview</h3>
          {justSaved && (
            <span className="flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
              <Check className="w-2.5 h-2.5" />
              Saved
            </span>
          )}
          {isDirty && !justSaved && (
            <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
              Unsaved changes
            </span>
          )}
        </div>
        {isDirty && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={onDiscard}
              className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border border-neutral-300 hover:bg-neutral-100 text-neutral-600"
              title="Discard changes"
            >
              <RotateCcw className="w-3 h-3 shrink-0" />
              Discard
            </button>
            <button
              onClick={onSave}
              className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
              title="Save changes"
            >
              <Save className="w-3 h-3 shrink-0" />
              Save
            </button>
          </div>
        )}
      </header>

      {/* Export bar */}
      <div className="border-b border-neutral-200 px-3 py-2 flex flex-wrap items-center gap-1 bg-neutral-50">
        <button
          onClick={() => {
            navigator.clipboard.writeText(JSON.stringify(course, null, 2));
          }}
          className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border border-neutral-300 hover:bg-white text-neutral-700 transition-colors"
          title="Copy JSON to clipboard"
        >
          <Copy className="w-3 h-3 shrink-0" />
          Copy
        </button>
        <button
          onClick={() => {
            const blob = new Blob([JSON.stringify(course, null, 2)], {
              type: "application/json",
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${course.title.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}.json`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border border-neutral-300 hover:bg-white text-neutral-700 transition-colors"
          title="Download JSON"
        >
          <FileJson className="w-3 h-3 shrink-0" />
          JSON
        </button>
        <button
          onClick={async () => {
            const { buildScormPackage, downloadScormPackage } = await import("@/lib/scorm");
            const blob = await buildScormPackage(course, branding);
            downloadScormPackage(blob, course.title, branding?.clientName);
          }}
          className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border border-neutral-300 hover:bg-white text-neutral-700 transition-colors"
          title="Download SCORM 1.2 package"
        >
          <Package className="w-3 h-3 shrink-0" />
          SCORM
        </button>
        <button
          onClick={() => downloadMemo(course, branding)}
          className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-medium transition-colors"
          title="Download training memorandum"
        >
          <FileText className="w-3 h-3 shrink-0" />
          Memo
        </button>
        <button
          onClick={() => downloadDocx(course, branding)}
          className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-800 font-medium transition-colors"
          title="Download Word handbook"
        >
          <FileType className="w-3 h-3 shrink-0" />
          Word
        </button>
        <button
          onClick={() => downloadPptx(course, branding)}
          className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border border-orange-300 bg-orange-50 hover:bg-orange-100 text-orange-800 font-medium transition-colors"
          title="Download PowerPoint slides"
        >
          <Presentation className="w-3 h-3 shrink-0" />
          PPTX
        </button>
      </div>

      {/* Preview content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-5 space-y-5">
          {/* Course header */}
          <div
            className="rounded-lg p-4 border-t-4"
            style={{
              borderColor: palette.accent,
              background: palette.paper,
              color: palette.ink,
            }}
          >
            <p
              className="text-[10px] uppercase tracking-wider mb-1 font-semibold"
              style={{ color: palette.primary }}
            >
              {branding?.clientName || "Course"}
            </p>
            {site ? (
              <a
                href={site}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] underline mb-2 block"
                style={{ color: palette.primary }}
              >
                {site.replace(/\/$/, "")}
              </a>
            ) : null}
            <EditableText
              value={course.title}
              onChange={(v) => onUpdateCard && onUpdateCard(-1, -1, v)}
              className="text-base font-semibold text-neutral-900 leading-tight block"
              multiline={false}
            />
            {course.description && (
              <EditableText
                value={course.description}
                onChange={(v) => onUpdateCard && onUpdateCard(-1, -2, v)}
                className="text-xs text-neutral-600 mt-2 block"
                multiline={true}
              />
            )}
            <p className="text-[10px] text-neutral-500 mt-3">
              {course.modules.length} module{course.modules.length === 1 ? "" : "s"} ·{" "}
              {course.modules.reduce((n, m) => n + m.content.length, 0)} cards ·{" "}
              {course.modules.reduce((n, m) => n + m.quiz.length, 0)} questions
            </p>
          </div>

          {/* Modules */}
          {course.modules.map((mod, mi) => (
            <div
              key={mod.id || mi}
              className="border border-neutral-200 rounded-lg overflow-hidden bg-white"
            >
              {/* Module header */}
              <div className="bg-neutral-50 px-4 py-3 border-b border-neutral-200">
                <p className="text-[10px] uppercase tracking-wider text-neutral-600">
                  Module {mi + 1}
                </p>
                <EditableText
                  value={mod.title}
                  onChange={(v) => onUpdateModuleTitle && onUpdateModuleTitle(mi, v)}
                  className="text-sm font-medium text-neutral-900 mt-0.5 block"
                  multiline={false}
                />
              </div>

              {/* Content cards */}
              <div className="p-4 space-y-3">
                {mod.content.map((card, ci) => (
                  <div
                    key={ci}
                    className="border-l-2 border-neutral-300 pl-3"
                  >
                    <EditableText
                      value={card}
                      onChange={(v) => onUpdateCard && onUpdateCard(mi, ci, v)}
                      className="text-xs text-neutral-700 leading-relaxed block"
                      multiline={true}
                    />
                  </div>
                ))}
              </div>

              {/* Scenario */}
              <div className="border-t border-neutral-200 p-4 bg-amber-50/40">
                <p className="text-[10px] uppercase tracking-wider text-amber-700 mb-2">
                  Branching Scenario
                </p>
                <EditableText
                  value={mod.scenario.prompt}
                  onChange={(v) =>
                    onUpdateScenario && onUpdateScenario(mi, "prompt", v)
                  }
                  className="text-xs text-neutral-300 mb-3 block"
                  multiline={true}
                />
                <div className="space-y-2">
                  {mod.scenario.options.map((opt, oi) => (
                    <div
                      key={opt.id || oi}
                      className={cn(
                        "text-xs px-3 py-2 rounded border",
                        opt.isCorrect
                          ? "border-emerald-900 bg-emerald-950/30 text-emerald-300"
                          : "border-neutral-800 bg-neutral-900/50 text-neutral-400"
                      )}
                    >
                      <span className="font-mono mr-2">
                        {String.fromCharCode(65 + oi)})
                      </span>
                      <EditableText
                        value={opt.text}
                        onChange={(v) =>
                          onUpdateScenarioOption &&
                          onUpdateScenarioOption(mi, oi, "text", v)
                        }
                        className="inline"
                        multiline={false}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Quiz */}
              <div className="border-t border-neutral-800 p-4">
                <p className="text-[10px] uppercase tracking-wider text-blue-500 mb-2">
                  Quiz ({mod.quiz.length} question{mod.quiz.length === 1 ? "" : "s"})
                </p>
                {mod.quiz.map((q, qi) => (
                  <div key={qi} className="mb-3 last:mb-0">
                    <div className="text-xs text-neutral-300 mb-1.5">
                      <span className="mr-1">{qi + 1}.</span>
                      <EditableText
                        value={q.question}
                        onChange={(v) =>
                          onUpdateQuizQuestion && onUpdateQuizQuestion(mi, qi, v)
                        }
                        className="inline"
                        multiline={false}
                      />
                    </div>
                    <div className="space-y-1">
                      {q.options.map((o, oi) => (
                        <div
                          key={oi}
                          className={cn(
                            "text-[11px] pl-4",
                            oi === q.correctIndex
                              ? "text-emerald-400"
                              : "text-neutral-500"
                          )}
                        >
                          <span className="mr-1">
                            {oi === q.correctIndex ? "✓" : "○"}
                          </span>
                          <EditableText
                            value={o}
                            onChange={(v) =>
                              onUpdateQuizOption &&
                              onUpdateQuizOption(mi, qi, oi, v)
                            }
                            className="inline"
                            multiline={false}
                          />
                        </div>
                      ))}
                    </div>
                    {q.rationale ? (
                      <p className="text-[11px] text-neutral-600 mt-1.5 leading-relaxed">{q.rationale}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
