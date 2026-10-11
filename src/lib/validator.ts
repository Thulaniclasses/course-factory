import type { GeneratedCourse } from "./ai";
import {
  type CourseSettings,
  DEFAULT_SETTINGS,
  resolveModuleCount,
  resolveQuizPerModule,
} from "./courseSettings";

export interface ValidationFailure {
  code: string;
  message: string;
  severity: "error" | "warning";
}

export interface ValidationResult {
  passed: boolean;
  score: number;
  failures: ValidationFailure[];
  stats: {
    moduleCount: number;
    totalCards: number;
    totalQuiz: number;
    totalObjectives: number;
  };
}

// Dynamic requirements based on user settings
function getRequirements(settings: CourseSettings = DEFAULT_SETTINGS) {
  const targetModules = resolveModuleCount(settings);
  const targetQuiz = resolveQuizPerModule(settings);
  return {
    minModules: targetModules, // must hit the target exactly
    idealModules: targetModules,
    minCardsPerModule: 3,
    minQuizPerModule: targetQuiz, // must hit the target exactly
    idealQuizPerModule: targetQuiz,
    minObjectivesPerModule: 2,
  };
}

export function validateCourse(
  course: GeneratedCourse,
  settings: CourseSettings = DEFAULT_SETTINGS
): ValidationResult {
  const REQUIREMENTS = getRequirements(settings);
  const failures: ValidationFailure[] = [];

  if (!course || !Array.isArray(course.modules)) {
    return {
      passed: false,
      score: 0,
      failures: [
        {
          code: "NO_MODULES",
          message: "Course has no modules array",
          severity: "error",
        },
      ],
      stats: { moduleCount: 0, totalCards: 0, totalQuiz: 0, totalObjectives: 0 },
    };
  }

  const stats = {
    moduleCount: course.modules.length,
    totalCards: course.modules.reduce(
      (sum, m) => sum + (m.content?.length || 0),
      0
    ),
    totalQuiz: course.modules.reduce(
      (sum, m) => sum + (m.quiz?.length || 0),
      0
    ),
    totalObjectives: course.modules.reduce(
      (sum, m) => sum + (m.learningObjectives?.length || 0),
      0
    ),
  };

  if (stats.moduleCount < REQUIREMENTS.minModules) {
    failures.push({
      code: "TOO_FEW_MODULES",
      message: `Only ${stats.moduleCount} module(s). Requires at least ${REQUIREMENTS.minModules} (target ${REQUIREMENTS.idealModules}).`,
      severity: "error",
    });
  }

  course.modules.forEach((m, i) => {
    const label = `Module ${i + 1} ("${m.title || "untitled"}")`;

    if (
      !m.learningObjectives ||
      m.learningObjectives.length < REQUIREMENTS.minObjectivesPerModule
    ) {
      failures.push({
        code: "MISSING_OBJECTIVES",
        message: `${label} has ${m.learningObjectives?.length || 0} learning objective(s). Requires ${REQUIREMENTS.minObjectivesPerModule}+.`,
        severity: "error",
      });
    }

    if (!m.content || m.content.length < REQUIREMENTS.minCardsPerModule) {
      failures.push({
        code: "TOO_FEW_CARDS",
        message: `${label} has ${m.content?.length || 0} content card(s). Requires ${REQUIREMENTS.minCardsPerModule}+.`,
        severity: "warning",
      });
    }

    if (!m.quiz || m.quiz.length < REQUIREMENTS.minQuizPerModule) {
      failures.push({
        code: "TOO_FEW_QUIZ",
        message: `${label} has ${m.quiz?.length || 0} quiz question(s). Requires ${REQUIREMENTS.minQuizPerModule}+.`,
        severity: "error",
      });
    }

    if (!m.scenario || !m.scenario.options || m.scenario.options.length !== 2) {
      failures.push({
        code: "BAD_SCENARIO",
        message: `${label} scenario must have exactly 2 options.`,
        severity: "error",
      });
    }
  });

  let score = 100;
  for (const f of failures) {
    score -= f.severity === "error" ? 15 : 5;
  }
  score = Math.max(0, score);

  const errorCount = failures.filter((f) => f.severity === "error").length;
  const passed = errorCount === 0;

  return { passed, score, failures, stats };
}

export function buildRetryPrompt(
  originalSource: string,
  validation: ValidationResult,
  settings: CourseSettings = DEFAULT_SETTINGS
): string {
  const REQUIREMENTS = getRequirements(settings);
  const errorMessages = validation.failures
    .filter((f) => f.severity === "error")
    .map((f) => `- ${f.message}`)
    .join("\n");

  return `Your previous output FAILED quality control. Here are the specific problems:

${errorMessages}

CORRECTIONS REQUIRED — you must fix ALL of the following:

1. Produce EXACTLY ${REQUIREMENTS.idealModules} modules (not fewer, not more).
2. Each module MUST have at least ${REQUIREMENTS.minObjectivesPerModule} learning objectives starting with "By the end of this module, learners will be able to..."
3. Each module MUST have at least ${REQUIREMENTS.minCardsPerModule} content cards. Each card must be substantive (2-4 sentences, one focused idea).
4. Each module MUST have at least ${REQUIREMENTS.minQuizPerModule} quiz questions with 4 options each.
5. Each module MUST have exactly ONE branching scenario with EXACTLY 2 options (one correct, one incorrect), each with detailed feedback.

Do NOT summarize. Do NOT cut content. Do NOT repeat modules. Produce the full ${REQUIREMENTS.idealModules}-module structure now.

SOURCE MATERIAL (regenerate from this):
${originalSource}`;
}
