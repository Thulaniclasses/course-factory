"use client";

import { useEffect, useState } from "react";
import { Plus, BookOpen, Settings, Sparkles, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { loadCourses, deleteCourse, type SavedCourse } from "@/lib/store";
import type { GeneratedCourse } from "@/lib/ai";

interface SidebarProps {
  onSelect: (course: GeneratedCourse) => void;
}

export function Sidebar({ onSelect }: SidebarProps) {
  const [saved, setSaved] = useState<SavedCourse[]>([]);

  const refresh = () => setSaved(loadCourses());

  useEffect(() => {
    refresh();
    const handler = () => refresh();
    window.addEventListener("course-factory:updated", handler);
    return () => window.removeEventListener("course-factory:updated", handler);
  }, []);

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteCourse(id);
  };

  return (
    <aside className="w-64 h-screen bg-neutral-950 border-r border-neutral-800 flex flex-col">
      <div className="p-5 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-black" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white">Course Factory</h1>
            <p className="text-[10px] text-neutral-500 uppercase tracking-wider">
              AI eLearning Engine
            </p>
          </div>
        </div>
      </div>

      <div className="p-4">
        <button
          onClick={() => window.location.reload()}
          className="w-full flex items-center justify-center gap-2 bg-white text-black font-medium text-sm py-2.5 rounded-lg hover:bg-neutral-200 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Course
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3">
        <p className="text-[10px] uppercase tracking-wider text-neutral-500 px-2 mb-2">
          Recent Courses ({saved.length})
        </p>
        {saved.length === 0 && (
          <p className="text-xs text-neutral-600 px-2 py-1">
            No courses yet. Generate one to get started.
          </p>
        )}
        {saved.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelect(item.course)}
            className="w-full flex items-start gap-2 px-2 py-2 rounded-md hover:bg-neutral-900 transition-colors text-left group"
          >
            <BookOpen className="w-4 h-4 text-neutral-500 mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-neutral-300 truncate group-hover:text-white">
                {item.course.title}
              </p>
              <p className="text-[10px] uppercase tracking-wider text-neutral-600">
                {new Date(item.savedAt).toLocaleDateString()}
              </p>
            </div>
            <span
              onClick={(e) => handleDelete(e, item.id)}
              className="opacity-0 group-hover:opacity-100 text-neutral-600 hover:text-red-500 transition-opacity mt-0.5"
              role="button"
              aria-label="Delete course"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </span>
          </button>
        ))}
      </div>

      <div className="p-4 border-t border-neutral-800">
        <button className="w-full flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors">
          <Settings className="w-4 h-4" />
          Settings
        </button>
      </div>
    </aside>
  );
}
