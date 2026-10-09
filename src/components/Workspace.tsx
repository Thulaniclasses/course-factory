"use client";

import { useState } from "react";
import { Sparkles, Upload, FileText, X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GeneratedCourse } from "@/lib/ai";

const LOADING_STAGES = [
  "Analyzing source material...",
  "Extracting key concepts...",
  "Structuring modules...",
  "Designing branching scenarios...",
  "Writing quiz questions...",
  "Finalizing course...",
];

interface WorkspaceProps {
  onCourseGenerated: (course: GeneratedCourse) => void;
}

export function Workspace({ onCourseGenerated }: WorkspaceProps) {
  const [content, setContent] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingStage, setLoadingStage] = useState(0);
  const [error, setError] = useState<string | null>(null);

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
        body: JSON.stringify({ sourceText: content }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate course");
      }

      onCourseGenerated(data.course);
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

  return (
    <div className="flex-1 flex flex-col h-screen bg-black overflow-hidden">
      <header className="border-b border-neutral-800 px-8 py-5 flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Create New Course</h2>
          <p className="text-sm text-neutral-500 mt-1">
            Paste your source material. The AI will structure it into a full interactive course.
          </p>
        </div>
        {(content || fileName) && (
          <button
            onClick={handleClear}
            className="text-xs text-neutral-500 hover:text-white transition-colors flex items-center gap-1"
          >
            <X className="w-3.5 h-3.5" />
            Clear
          </button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-3xl mx-auto space-y-6">
          {error && (
            <div className="flex items-start gap-3 bg-red-950/40 border border-red-900/60 rounded-lg p-4">
              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
              <div className="text-sm text-red-200">
                <p className="font-medium">Generation failed</p>
                <p className="text-red-300/80 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            className="border-2 border-dashed border-neutral-800 rounded-xl p-8 text-center hover:border-neutral-700 transition-colors cursor-pointer"
          >
            {fileName ? (
              <div className="flex items-center justify-center gap-2 text-white">
                <FileText className="w-5 h-5 text-emerald-500" />
                <span className="text-sm">{fileName}</span>
                <button
                  onClick={() => setFileName(null)}
                  className="text-neutral-500 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <Upload className="w-8 h-8 text-neutral-600 mx-auto mb-3" />
                <p className="text-sm text-neutral-400">
                  Drag & drop a PDF, DOCX, or TXT file
                </p>
                <p className="text-xs text-neutral-600 mt-1">
                  Or paste your content below
                </p>
              </>
            )}
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider text-neutral-500 mb-2 block">
              Source Material
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste FATF recommendations, AML regulations, internal SOPs, or any subject matter here..."
              className="w-full h-64 bg-neutral-950 border border-neutral-800 rounded-xl p-4 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-neutral-600 resize-none"
              disabled={isGenerating}
            />
            <div className="flex items-center justify-between mt-2">
              <p
                className={cn(
                  "text-xs",
                  content.length >= 50 ? "text-emerald-500" : "text-neutral-600"
                )}
              >
                {content.length} characters{content.length < 50 && " (min 50)"}
              </p>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating || content.trim().length < 50}
            className={cn(
              "w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-sm transition-all",
              isGenerating
                ? "bg-neutral-800 text-neutral-500 cursor-wait"
                : "bg-white text-black hover:bg-neutral-200 disabled:bg-neutral-900 disabled:text-neutral-600 disabled:cursor-not-allowed"
            )}
          >
            <Sparkles
              className={cn("w-4 h-4", isGenerating && "animate-pulse")}
            />
            {isGenerating ? LOADING_STAGES[loadingStage] : "Generate Course"}
          </button>
        </div>
      </div>
    </div>
  );
}
