"use client";

import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Workspace } from "@/components/Workspace";
import { Preview } from "@/components/Preview";
import { saveCourse } from "@/lib/store";
import type { GeneratedCourse } from "@/lib/ai";

export default function Home() {
  const [course, setCourse] = useState<GeneratedCourse | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleCourseGenerated = async (newCourse: GeneratedCourse) => {
    setCourse(newCourse);
    setSaveError(null);
    const result = await saveCourse(newCourse);
    if (!result.ok) {
      console.error("Failed to save course:", result.error);
      setSaveError(result.error);
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50">
      {/* Brand bar */}
      <header className="cf-brand-bar">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center backdrop-blur-sm">
            <span className="text-white text-sm font-bold">CF</span>
          </div>
          <div>
            <h1>Course Factory</h1>
            <p className="subtitle">AI eLearning Engine</p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2">
          <span className="cf-brand-badge">
            <span className="dot" />
            Local backend
          </span>
          <span className="cf-brand-badge">
            v1.0
          </span>
        </div>
      </header>

      {/* Three-column body */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar onSelect={setCourse} />
        <Workspace onCourseGenerated={handleCourseGenerated} saveError={saveError} setSaveError={setSaveError} />
        <Preview course={course} />
      </div>
    </div>
  );
}
