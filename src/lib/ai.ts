import OpenAI from "openai";
import { validateCourse, buildRetryPrompt } from "./validator";
import {
  type CourseSettings,
  DEFAULT_SETTINGS,
  resolveModuleCount,
  resolveQuizPerModule,
} from "./courseSettings";

export interface CourseScenarioOption {
  id: string;
  text: string;
  isCorrect: boolean;
  feedback: string;
}

export interface CourseQuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

export interface CourseModule {
  id: string;
  title: string;
  learningObjectives: string[];
  content: string[];
  scenario: {
    prompt: string;
    options: CourseScenarioOption[];
  };
  quiz: CourseQuizQuestion[];
}

export interface GeneratedCourse {
  title: string;
  description: string;
  targetAudience: string;
  estimatedDuration: string;
  modules: CourseModule[];
  generatedAt?: string;
}

// ============================================================
// PROVIDER CONFIGURATION
// ============================================================
const AI_MODE = process.env.AI_MODE || "openai";
const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.1:8b";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

// ============================================================
// SYSTEM PROMPT (identical for both providers)
// ============================================================
const SYSTEM_PROMPT = `You are a senior Instructional Designer and Subject Matter Expert (SME) in Anti-Money Laundering (AML), Counter-Financing of Terrorism (CFT), and Financial Intelligence Unit (FIU) operations.

Your task: transform raw source material into a structured, interactive eLearning course aligned with the Egmont Group / ECOFEL Certification Program (ECP) standards.

RULES:
1. Create 3 to 5 modules. Each module should take 8-12 minutes to complete.
2. Each module MUST start with EXACTLY 3 measurable learning objectives. Each objective must begin with "By the end of this module, learners will be able to..." followed by a Bloom's taxonomy verb (identify, apply, analyze, evaluate, draft, assess). Do NOT skip this field.
3. Each module must have 3-5 content cards. Each card = 1 focused idea, 2-4 sentences max. No walls of text.
4. Each module must have ONE branching scenario with exactly 2 options (one correct, one incorrect). Scenarios MUST be operationally realistic for FIU analysts — e.g., reviewing Suspicious Transaction Reports (STRs), coordinating with law enforcement, drafting National Risk Assessment (NRA) data requests, handling international FIU-to-FIU information exchange.
5. Each module must have 2-3 quiz questions with 4 options each.
6. Reference authoritative frameworks where relevant: FATF Recommendations (cite by number, e.g., "FATF Recommendation 1", "FATF Recommendation 20"), UN Conventions, Wolfsberg Principles, Egmont Group Principles for Information Exchange.
7. Use terminology correctly: ML (Money Laundering), TF (Terrorist Financing), STR (Suspicious Transaction Report), SAR (Suspicious Activity Report), FIU (Financial Intelligence Unit), NRA (National Risk Assessment), RBA (Risk-Based Approach), PEP (Politically Exposed Person), CDD (Customer Due Diligence), EDD (Enhanced Due Diligence).
8. Language must be professional, precise, and accessible to FIU analysts globally — including those in developing jurisdictions with limited resources.
9. Avoid country-specific legal references (e.g., don't cite "US Bank Secrecy Act") — stick to international frameworks.
10. Always respond with valid JSON only — no markdown, no explanations, no code fences.

CRITICAL SELF-CHECK before responding:
- Does EACH module have the EXACT required number of content cards? (Count them. Do not under-deliver.)
- Does EACH module have the EXACT required number of quiz questions? (Count them. Do not under-deliver.)
- Does EACH module have exactly 3 learning objectives? (Count them.)
- Does EACH module have a branching scenario with exactly 2 options?
- Is every module teaching NEW content (no filler "conclusion" modules)?
If ANY of these are wrong, fix them BEFORE responding.

OUTPUT SCHEMA (must match exactly):
{
  "title": "string (concise, professional)",
  "description": "string (1-2 sentences)",
  "targetAudience": "string (e.g., 'FIU analysts, compliance officers, and AML/CFT practitioners')",
  "estimatedDuration": "string (e.g., '45 minutes')",
  "modules": [
    {
      "id": "m1",
      "title": "string",
      "learningObjectives": [
        "By the end of this module, learners will be able to...",
        "By the end of this module, learners will be able to..."
      ],
      "content": ["card 1 text", "card 2 text", "card 3 text"],
      "scenario": {
        "prompt": "string (the scenario setup — must be an FIU operational context)",
        "options": [
          { "id": "a", "text": "string", "isCorrect": false, "feedback": "string" },
          { "id": "b", "text": "string", "isCorrect": true, "feedback": "string" }
        ]
      },
      "quiz": [
        { "question": "string", "options": ["a", "b", "c", "d"], "correctIndex": 0 }
      ]
    }
  ]
}`;


// ============================================================
// DYNAMIC SYSTEM PROMPT — respects user-selected size/quiz depth
// ============================================================
function buildSystemPrompt(settings: CourseSettings): string {
  const targetModules = resolveModuleCount(settings);
  const targetQuiz = resolveQuizPerModule(settings);
  const targetCards = 4; // per module

  // Prepend a loud, unmissable mandate with exact counts
  const mandate = `\n=== MANDATORY COUNTS FOR THIS GENERATION ===\n` +
    `- Total modules: EXACTLY ${targetModules}\n` +
    `- Content cards per module: EXACTLY ${targetCards}\n` +
    `- Quiz questions per module: EXACTLY ${targetQuiz}\n` +
    `- Learning objectives per module: EXACTLY 3\n` +
    `- Branching scenarios: EXACTLY 1 per module (2 options each)\n` +
    `Do NOT produce fewer than these counts. Do NOT merge modules. Do NOT create filler conclusion modules.\n` +
    `=============================================\n\n` +
    `Return SYSTEM_PROMPT with those numbers enforced.`;

  return mandate + SYSTEM_PROMPT
    .replace(
      /1\. Create 3 to 5 modules[^\n]*/,
      `1. Create EXACTLY ${targetModules} modules. Each module should take 8-12 minutes to complete.`
    )
    .replace(
      /3\. Each module must have 3-5 content cards[^\n]*/,
      `3. Each module MUST have EXACTLY ${targetCards} content cards. Not 2, not 3 — exactly ${targetCards}. Each card = 1 focused idea, 2-4 sentences. Each card must add NEW information (no repetition between cards).`
    )
    .replace(
      /5\. Each module must have 2-3 quiz questions[^\n]*/,
      `5. Each module MUST have EXACTLY ${targetQuiz} quiz question(s) with 4 options each. Not 1 — exactly ${targetQuiz}. Every quiz must test understanding, not recall.`
    );
}

// ============================================================
// OLLAMA PROVIDER
// ============================================================
async function generateWithOllama(
  sourceText: string,
  settings: CourseSettings = DEFAULT_SETTINGS
): Promise<GeneratedCourse> {
  const response = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      stream: false,
      format: "json",
      messages: [
        { role: "system", content: buildSystemPrompt(settings) },
        {
          role: "user",
          content: `Transform this source material into an eLearning course aligned with ECOFEL/ECP standards:\n\n${sourceText}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(
      `Ollama request failed (${response.status}). Is 'ollama serve' running? ${errText}`
    );
  }

  const data = await response.json();
  const raw = data?.message?.content;
  if (!raw) throw new Error("Empty response from Ollama");

  return JSON.parse(raw) as GeneratedCourse;
}

// ============================================================
// OPENAI PROVIDER
// ============================================================
async function generateWithOpenAI(
  sourceText: string,
  settings: CourseSettings = DEFAULT_SETTINGS
): Promise<GeneratedCourse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !apiKey.startsWith("sk-")) {
    throw new Error("OPENAI_API_KEY missing or invalid in .env.local");
  }

  const openai = new OpenAI({ apiKey });

  const response = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    response_format: { type: "json_object" },
    temperature: 0.7,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Transform this source material into an eLearning course aligned with ECOFEL/ECP standards:\n\n${sourceText}`,
      },
    ],
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) throw new Error("Empty response from OpenAI");

  return JSON.parse(raw) as GeneratedCourse;
}

// ============================================================
// HYBRID RETRY — always uses OpenAI for quality-critical retries
// ============================================================
async function retryWithCloud(
  retryPrompt: string
): Promise<GeneratedCourse> {
  return generateWithOpenAI(retryPrompt);
}


// ============================================================
// MAIN ENTRYPOINT — switch on AI_MODE
// ============================================================
export async function generateCourse(
  sourceText: string,
  options?: { maxRetries?: number; settings?: CourseSettings }
): Promise<GeneratedCourse & { _quality?: { score: number; attempts: number; failures: string[] } }> {
  const maxRetries = options?.maxRetries ?? 2;
  const settings = options?.settings ?? DEFAULT_SETTINGS;

  // Hybrid: local Llama first, cloud retry. Local: always local. Else: always cloud.
  const provider = (AI_MODE === "local" || AI_MODE === "hybrid")
    ? generateWithOllama
    : generateWithOpenAI;

  // --- Attempt 1 ---
  let course = await provider(sourceText, settings);
  let validation = validateCourse(course, settings);
  let attempts = 1;

  console.log(
    `[validator] Attempt ${attempts}: score=${validation.score}, modules=${validation.stats.moduleCount}, passed=${validation.passed}`
  );

  // --- Escalating retry loop ---
  // Retry 1: same provider (local stays local, hybrid goes to cloud)
  // Retry 2: FORCE cloud escalation if still failing
  while (!validation.passed && attempts <= maxRetries) {
    attempts++;
    const isLastAttempt = attempts === maxRetries;
    const useCloud = AI_MODE === "hybrid" || isLastAttempt;

    console.log(
      `[validator] Retry ${attempts}/${maxRetries} (${useCloud ? "CLOUD" : "local"}) — ${validation.failures.filter((f) => f.severity === "error").length} error(s) to fix`
    );

    try {
      const retryPrompt = buildRetryPrompt(sourceText, validation, settings);
      const retryCourse = useCloud
        ? await retryWithCloud(retryPrompt)
        : await provider(retryPrompt, settings);
      const retryValidation = validateCourse(retryCourse, settings);

      console.log(
        `[validator] Attempt ${attempts + 1}: score=${retryValidation.score}, modules=${retryValidation.stats.moduleCount}, passed=${retryValidation.passed}`
      );

      // Keep whichever attempt scored higher
      if (retryValidation.score > validation.score) {
        course = retryCourse;
        validation = retryValidation;
      }
    } catch (err) {
      console.error(`[validator] Retry attempt ${attempts} failed:`, err);
    }
  }

  // --- Attach quality metadata (prefixed with _ to indicate internal) ---
  return {
    ...course,
    _quality: {
      score: validation.score,
      attempts,
      failures: validation.failures.map((f) => f.message),
    },
  };
}

// ============================================================
// HEALTH CHECK — used by UI to show provider status
// ============================================================
export async function checkProvider(): Promise<{
  mode: string;
  available: boolean;
  message: string;
}> {
  if (AI_MODE === "local" || AI_MODE === "hybrid") {
    try {
      const res = await fetch(`${OLLAMA_URL}/api/tags`);
      if (!res.ok) throw new Error("not ok");
      const data = await res.json();
      const hasModel = data?.models?.some(
        (m: { name: string }) => m.name === OLLAMA_MODEL
      );
      const isHybrid = AI_MODE === "hybrid";
      return {
        mode: isHybrid ? "hybrid" : "local",
        available: hasModel,
        message: hasModel
          ? `Ollama running · ${OLLAMA_MODEL}`
          : `Ollama running · model '${OLLAMA_MODEL}' not pulled`,
      };
    } catch {
      return {
        mode: "local",
        available: false,
        message: "Ollama not reachable — start 'ollama serve'",
      };
    }
  }
  return {
    mode: AI_MODE === "hybrid" ? "hybrid" : "openai",
    available: !!process.env.OPENAI_API_KEY,
    message: AI_MODE === "hybrid"
      ? "Hybrid · Llama local + GPT-4o-mini retry"
      : "OpenAI (cloud)",
  };
}
