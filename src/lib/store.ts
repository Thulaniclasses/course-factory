// Course store backed by the Course Factory Python backend (Postgres).
// Same exports as before; the functions are now async.

import type { GeneratedCourse } from "./ai";

export interface SavedCourse {
  id: string;
  course: GeneratedCourse;
  savedAt: string;
}

export interface CourseMeta {
  id: string;
  title: string;
  description?: string;
  savedAt: string;
  module_count: number;
  published?: boolean;
}

const API_BASE = "/api/v1";

async function apiGet<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch (e) {
    console.error("apiGet failed", path, e);
    return null;
  }
}

async function apiPost<T>(path: string, body?: unknown): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      console.error("apiPost failed", path, res.status);
      return null;
    }
    return (await res.json()) as T;
  } catch (e) {
    console.error("apiPost failed", path, e);
    return null;
  }
}

async function apiDelete<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`, { method: "DELETE" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch (e) {
    console.error("apiDelete failed", path, e);
    return null;
  }
}

export async function loadCourses(): Promise<CourseMeta[]> {
  const rows = await apiGet<CourseMeta[]>("/courses");
  return rows || [];
}

export async function saveCourse(
  course: GeneratedCourse,
  sourceText = ""
): Promise<{ ok: true; saved: SavedCourse } | { ok: false; error: string }> {
  const payload = {
    title: course.title,
    description: course.description,
    generatedAt: course.generatedAt,
    modules: course.modules,
    sourceText,
  };
  try {
    const res = await fetch(`${API_BASE}/courses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      let detail = `HTTP ${res.status}`;
      try {
        const body = await res.json();
        if (body && typeof body === "object") {
          const d: any = (body as any).detail;
          if (d && typeof d === "object" && d.message) detail = String(d.message);
          else if (typeof d === "string") detail = d;
          else if (body && (body as any).message) detail = String((body as any).message);
        }
      } catch { /* ignore */ }
      return { ok: false as const, error: detail };
    }
    const saved = (await res.json()) as { id: string; course: GeneratedCourse; savedAt: string };
    window.dispatchEvent(new Event("course-factory:updated"));
    return { ok: true as const, saved };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Network error" };
  }
}

export async function deleteCourse(id: string): Promise<void> {
  await apiDelete(`/courses/${id}`);
  window.dispatchEvent(new Event("course-factory:updated"));
}

export async function getCourse(id: string) {
  return apiGet<{ id: string; course: GeneratedCourse; savedAt: string }>(`/courses/${id}`);
}

export async function setPublished(id: string, published: boolean): Promise<void> {
  await apiPost(`/courses/${id}/publish?published=${published ? "true" : "false"}`);
  window.dispatchEvent(new Event("course-factory:updated"));
}
