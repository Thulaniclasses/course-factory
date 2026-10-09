"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Workspace } from "@/components/Workspace";
import { Preview } from "@/components/Preview";
import { saveCourse } from "@/lib/store";
import type { GeneratedCourse } from "@/lib/ai";

export default function Home() {
  const [course, setCourse] = useState<GeneratedCourse | null>(null);

  const handleCourseGenerated = (newCourse: GeneratedCourse) => {
    setCourse(newCourse);
    saveCourse(newCourse); // persist to localStorage
  };

  return (
    <main className="flex h-screen bg-black text-white overflow-hidden">
      <Sidebar onSelect={setCourse} />
      <Workspace onCourseGenerated={handleCourseGenerated} />
      <Preview course={course} />
    </main>
  );
}
