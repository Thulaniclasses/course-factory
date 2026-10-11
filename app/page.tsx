"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Workspace } from "@/components/Workspace";
import { Preview } from "@/components/Preview";
import { saveCourse } from "@/lib/store";
import type { GeneratedCourse } from "@/lib/ai";

export default function Home() {
  const [course, setCourse] = useState<GeneratedCourse | null>(null);
  const [currentSettings, setCurrentSettings] = useState<import("@/lib/courseSettings").CourseSettings | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleCourseGenerated = (newCourse: GeneratedCourse, settings?: import("@/lib/courseSettings").CourseSettings) => {
    if (settings) setCurrentSettings(settings);
    setCourse(newCourse);
    saveCourse(newCourse);
    setIsDirty(false);
  };

  const markDirty = () => setIsDirty(true);

  // ------------------------------------------------------------
  // Field updaters (all mark dirty)
  // ------------------------------------------------------------
  const updateModuleTitle = (mi: number, title: string) => {
    if (!course) return;
    const modules = [...course.modules];
    modules[mi] = { ...modules[mi], title };
    setCourse({ ...course, modules });
    markDirty();
  };

  const updateCard = (mi: number, ci: number, text: string) => {
    if (!course) return;
    // Special case: -1, -1 = course title; -1, -2 = course description
    if (mi === -1 && ci === -1) {
      setCourse({ ...course, title: text });
      markDirty();
      return;
    }
    if (mi === -1 && ci === -2) {
      setCourse({ ...course, description: text });
      markDirty();
      return;
    }
    const modules = [...course.modules];
    const content = [...modules[mi].content];
    content[ci] = text;
    modules[mi] = { ...modules[mi], content };
    setCourse({ ...course, modules });
    markDirty();
  };

  const updateScenario = (
    mi: number,
    field: "prompt",
    value: string
  ) => {
    if (!course) return;
    const modules = [...course.modules];
    modules[mi] = {
      ...modules[mi],
      scenario: { ...modules[mi].scenario, [field]: value },
    };
    setCourse({ ...course, modules });
    markDirty();
  };

  const updateScenarioOption = (
    mi: number,
    oi: number,
    field: "text" | "feedback",
    value: string
  ) => {
    if (!course) return;
    const modules = [...course.modules];
    const options = [...modules[mi].scenario.options];
    options[oi] = { ...options[oi], [field]: value };
    modules[mi] = {
      ...modules[mi],
      scenario: { ...modules[mi].scenario, options },
    };
    setCourse({ ...course, modules });
    markDirty();
  };

  const updateQuizQuestion = (mi: number, qi: number, question: string) => {
    if (!course) return;
    const modules = [...course.modules];
    const quiz = [...modules[mi].quiz];
    quiz[qi] = { ...quiz[qi], question };
    modules[mi] = { ...modules[mi], quiz };
    setCourse({ ...course, modules });
    markDirty();
  };

  const updateQuizOption = (
    mi: number,
    qi: number,
    oi: number,
    text: string
  ) => {
    if (!course) return;
    const modules = [...course.modules];
    const quiz = [...modules[mi].quiz];
    const options = [...quiz[qi].options];
    options[oi] = text;
    quiz[qi] = { ...quiz[qi], options };
    modules[mi] = { ...modules[mi], quiz };
    setCourse({ ...course, modules });
    markDirty();
  };

  const handleSave = () => {
    if (!course) return;
    try {
      saveCourse(course);
      setIsDirty(false);
      setJustSaved(true);
      setSaveError(null);
      setTimeout(() => setJustSaved(false), 2000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed");
    }
  };

  const handleDiscard = () => {
    // Reload from localStorage (last saved version)
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  return (
    <main className="flex h-screen bg-black text-white overflow-hidden">
      <Sidebar onSelect={setCourse} />
      <Workspace
        onCourseGenerated={handleCourseGenerated}
        onSettingsChange={setCurrentSettings}
        saveError={saveError}
        setSaveError={setSaveError}
      />
      <Preview
        course={course}
        branding={currentSettings?.branding}
        isDirty={isDirty}
        justSaved={justSaved}
        onUpdateModuleTitle={updateModuleTitle}
        onUpdateCard={updateCard}
        onUpdateScenario={updateScenario}
        onUpdateScenarioOption={updateScenarioOption}
        onUpdateQuizQuestion={updateQuizQuestion}
        onUpdateQuizOption={updateQuizOption}
        onSave={handleSave}
        onDiscard={handleDiscard}
      />
    </main>
  );
}
