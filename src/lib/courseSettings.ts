// Course generation settings shared between UI and AI

export type CourseSize = "small" | "medium" | "large" | "custom";
export type QuizDepth = "light" | "standard" | "heavy";

export interface CourseSettings {
  size: CourseSize;
  customModules: number; // used only when size === "custom"
  quizDepth: QuizDepth;
}

export const DEFAULT_SETTINGS: CourseSettings = {
  size: "medium",
  customModules: 4,
  quizDepth: "standard",
};

export const SIZE_PRESETS: Record<Exclude<CourseSize, "custom">, { modules: number; label: string; description: string }> = {
  small: {
    modules: 2,
    label: "Small",
    description: "2 modules · quick intro",
  },
  medium: {
    modules: 4,
    label: "Medium",
    description: "4 modules · standard course",
  },
  large: {
    modules: 6,
    label: "Large",
    description: "6 modules · comprehensive",
  },
};

export const QUIZ_DEPTH_PRESETS: Record<QuizDepth, { perModule: number; label: string; description: string }> = {
  light: { perModule: 1, label: "Light", description: "1 quiz per module" },
  standard: { perModule: 2, label: "Standard", description: "2 quizzes per module" },
  heavy: { perModule: 3, label: "Heavy", description: "3 quizzes per module" },
};

/**
 * Resolve the number of modules from settings.
 */
export function resolveModuleCount(settings: CourseSettings): number {
  if (settings.size === "custom") {
    return Math.max(1, Math.min(10, settings.customModules));
  }
  return SIZE_PRESETS[settings.size].modules;
}

/**
 * Resolve the number of quiz questions per module.
 */
export function resolveQuizPerModule(settings: CourseSettings): number {
  return QUIZ_DEPTH_PRESETS[settings.quizDepth].perModule;
}

/**
 * Estimate total course duration in minutes.
 * Assumes ~5 min/module base + 1 min per quiz + 0.5 min per card.
 */
export function estimateDuration(settings: CourseSettings): {
  modules: number;
  cards: number;
  quizzes: number;
  minutes: number;
} {
  const modules = resolveModuleCount(settings);
  const quizPerModule = resolveQuizPerModule(settings);
  const cardsPerModule = 4; // target from prompt
  const quizzes = modules * quizPerModule;
  const cards = modules * cardsPerModule;

  // Rough timing: 3 min reading per module + 2 min per quiz + 1 min scenario
  const minutes = modules * 4 + quizzes * 1 + modules * 1;

  return { modules, cards, quizzes, minutes };
}

/**
 * Human-readable summary for the UI.
 */
export function describeSettings(settings: CourseSettings): string {
  const est = estimateDuration(settings);
  return `${est.modules} modules · ${est.cards} cards · ${est.quizzes} quizzes · ~${est.minutes} min`;
}
