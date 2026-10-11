"use client";

import { useCallback, useState } from "react";
import type { GeneratedCourse, CourseModule } from "./ai";
import { saveCourse } from "./store";

export interface EditorState {
  isEditing: boolean;
  isDirty: boolean;
  lastSaved: Date | null;
  justSaved: boolean;
}

export function useCourseEditor(initialCourse: GeneratedCourse | null) {
  const [course, setCourse] = useState<GeneratedCourse | null>(initialCourse);
  const [isDirty, setIsDirty] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // ============================================================
  // Update a module's top-level field (title)
  // ============================================================
  const updateModuleTitle = useCallback((moduleIndex: number, title: string) => {
    setCourse((prev) => {
      if (!prev) return prev;
      const modules = [...prev.modules];
      modules[moduleIndex] = { ...modules[moduleIndex], title };
      return { ...prev, modules };
    });
    setIsDirty(true);
  }, []);

  // ============================================================
  // Update a single content card
  // ============================================================
  const updateCard = useCallback(
    (moduleIndex: number, cardIndex: number, text: string) => {
      setCourse((prev) => {
        if (!prev) return prev;
        const modules = [...prev.modules];
        const content = [...modules[moduleIndex].content];
        content[cardIndex] = text;
        modules[moduleIndex] = { ...modules[moduleIndex], content };
        return { ...prev, modules };
      });
      setIsDirty(true);
    },
    []
  );

  // ============================================================
  // Update a scenario field
  // ============================================================
  const updateScenario = useCallback(
    (
      moduleIndex: number,
      field: "prompt",
      value: string
    ) => {
      setCourse((prev) => {
        if (!prev) return prev;
        const modules = [...prev.modules];
        const scenario = { ...modules[moduleIndex].scenario, [field]: value };
        modules[moduleIndex] = { ...modules[moduleIndex], scenario };
        return { ...prev, modules };
      });
      setIsDirty(true);
    },
    []
  );

  const updateScenarioOption = useCallback(
    (
      moduleIndex: number,
      optionIndex: number,
      field: "text" | "feedback",
      value: string
    ) => {
      setCourse((prev) => {
        if (!prev) return prev;
        const modules = [...prev.modules];
        const options = [...modules[moduleIndex].scenario.options];
        options[optionIndex] = { ...options[optionIndex], [field]: value };
        const scenario = { ...modules[moduleIndex].scenario, options };
        modules[moduleIndex] = { ...modules[moduleIndex], scenario };
        return { ...prev, modules };
      });
      setIsDirty(true);
    },
    []
  );

  // ============================================================
  // Update a quiz question or its options
  // ============================================================
  const updateQuizQuestion = useCallback(
    (moduleIndex: number, quizIndex: number, question: string) => {
      setCourse((prev) => {
        if (!prev) return prev;
        const modules = [...prev.modules];
        const quiz = [...modules[moduleIndex].quiz];
        quiz[quizIndex] = { ...quiz[quizIndex], question };
        modules[moduleIndex] = { ...modules[moduleIndex], quiz };
        return { ...prev, modules };
      });
      setIsDirty(true);
    },
    []
  );

  const updateQuizOption = useCallback(
    (moduleIndex: number, quizIndex: number, optionIndex: number, text: string) => {
      setCourse((prev) => {
        if (!prev) return prev;
        const modules = [...prev.modules];
        const quiz = [...modules[moduleIndex].quiz];
        const options = [...quiz[quizIndex].options];
        options[optionIndex] = text;
        quiz[quizIndex] = { ...quiz[quizIndex], options };
        modules[moduleIndex] = { ...modules[moduleIndex], quiz };
        return { ...prev, modules };
      });
      setIsDirty(true);
    },
    []
  );

  // ============================================================
  // Save to localStorage
  // ============================================================
  const save = useCallback(() => {
    if (!course) return;
    try {
      saveCourse(course);
      setIsDirty(false);
      setLastSaved(new Date());
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    } catch (err) {
      console.error("Save failed:", err);
    }
  }, [course]);

  // ============================================================
  // Discard changes (reload from parent)
  // ============================================================
  const discard = useCallback(() => {
    setCourse(initialCourse);
    setIsDirty(false);
  }, [initialCourse]);

  return {
    course,
    isDirty,
    justSaved,
    lastSaved,
    updateModuleTitle,
    updateCard,
    updateScenario,
    updateScenarioOption,
    updateQuizQuestion,
    updateQuizOption,
    save,
    discard,
  };
}
