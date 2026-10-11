"use client";

import { useEffect, useState } from "react";
import { Sparkles, Plus, BookOpen, Trash2, Settings } from "lucide-react";
import { loadCourses, deleteCourse } from "@/lib/store";
import type { GeneratedCourse } from "@/lib/ai";

interface SidebarProps {
  onSelect: (course: GeneratedCourse) => void;
}

interface CourseRow {
  id: string;
  title?: string;
  course?: GeneratedCourse;
  savedAt?: string;
  module_count?: number;
}

export function Sidebar({ onSelect }: SidebarProps) {
  const [saved, setSaved] = useState<CourseRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const rows = (await loadCourses()) as unknown as CourseRow[];
    setSaved(rows);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    const handler = () => refresh();
    window.addEventListener("course-factory:updated", handler);
    return () => window.removeEventListener("course-factory:updated", handler);
  }, []);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await deleteCourse(id);
  };

  const handleSelect = async (item: CourseRow) => {
    if (!item.course) {
      const { getCourse } = await import("@/lib/store");
      const full = await getCourse(item.id);
      if (full && full.course) onSelect(full.course);
    } else {
      onSelect(item.course);
    }
  };

  return (
    <aside
      className="w-72 h-screen flex flex-col"
      style={{ background: "#FFFFFF", borderRight: "1px solid #E2E8F0" }}
    >
      <div className="p-5" style={{ borderBottom: "1px solid #E2E8F0" }}>
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #003366 0%, #78BE20 100%)" }}
          >
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold" style={{ color: "#0F172A" }}>
              Course Factory
            </h1>
            <p className="text-[10px] font-medium uppercase tracking-[0.12em]" style={{ color: "#94A3B8" }}>
              AI eLearning
            </p>
          </div>
        </div>
      </div>

      <div className="p-4">
        <button
          onClick={() => window.location.reload()}
          className="cf-btn-primary w-full"
        >
          <Plus className="w-4 h-4" />
          New Course
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3">
        <p className="cf-label px-3 mb-2">
          Recent Courses{saved.length > 0 ? ` (${saved.length})` : ""}
        </p>

        {loading && (
          <div className="px-3 py-2 space-y-2">
            <div className="h-9 rounded-lg animate-pulse" style={{ background: "#F1F5F9" }} />
            <div className="h-9 rounded-lg animate-pulse" style={{ background: "#F1F5F9" }} />
          </div>
        )}

        {!loading && saved.length === 0 && (
          <div
            className="mx-3 mt-2 p-4 rounded-lg text-center"
            style={{ background: "#F8FAFC", border: "1px dashed #CBD5E1" }}
          >
            <BookOpen className="w-5 h-5 mx-auto mb-2" style={{ color: "#CBD5E1" }} />
            <p className="text-xs" style={{ color: "#64748B" }}>
              No courses yet.
              <br />
              Generate one to get started.
            </p>
          </div>
        )}

        {!loading &&
          saved.map((item) => (
            <button
              key={item.id}
              onClick={() => handleSelect(item)}
              className="cf-course-item group"
            >
              <BookOpen
                className="w-4 h-4 mt-0.5 shrink-0"
                style={{ color: "#94A3B8" }}
              />
              <div className="min-w-0 flex-1">
                <p className="cf-course-title">
                  {item.title || item.course?.title || "Untitled"}
                </p>
                {item.savedAt && (
                  <p className="cf-course-date">
                    {new Date(item.savedAt).toLocaleDateString()}
                    {typeof item.module_count === "number" &&
                      ` · ${item.module_count} module${item.module_count === 1 ? "" : "s"}`}
                  </p>
                )}
              </div>
              <span
                onClick={(e) => handleDelete(e, item.id)}
                className="cf-course-delete"
                role="button"
                aria-label="Delete course"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </span>
            </button>
          ))}
      </div>

      <div className="p-4" style={{ borderTop: "1px solid #E2E8F0" }}>
        <button className="cf-btn-ghost w-full flex items-center gap-2 justify-start">
          <Settings className="w-4 h-4" />
          Settings
        </button>
      </div>
    </aside>
  );
}
