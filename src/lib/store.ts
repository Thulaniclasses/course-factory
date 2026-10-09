import type { GeneratedCourse } from "./ai";

const KEY = "course-factory:courses";

export interface SavedCourse {
  id: string;
  course: GeneratedCourse;
  savedAt: string;
}

export function loadCourses(): SavedCourse[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedCourse[];
  } catch {
    return [];
  }
}

export function saveCourse(course: GeneratedCourse): SavedCourse {
  const saved: SavedCourse = {
    id: crypto.randomUUID(),
    course,
    savedAt: new Date().toISOString(),
  };
  const all = [saved, ...loadCourses()].slice(0, 20);
  localStorage.setItem(KEY, JSON.stringify(all));
  window.dispatchEvent(new Event("course-factory:updated"));
  return saved;
}

export function deleteCourse(id: string) {
  const filtered = loadCourses().filter((c) => c.id !== id);
  localStorage.setItem(KEY, JSON.stringify(filtered));
  window.dispatchEvent(new Event("course-factory:updated"));
}

export function clearCourses() {
  localStorage.removeItem(KEY);
  window.dispatchEvent(new Event("course-factory:updated"));
}
