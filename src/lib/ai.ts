import OpenAI from "openai";
import { validateCourse, buildRetryPrompt } from "./validator";
import {
  type CourseSettings,
  CARDS_PER_MODULE,
  DEFAULT_SETTINGS,
  resolveModuleCount,
  resolveQuizPerModule,
} from "./courseSettings";
import { getTemplate } from "./templates";
import { DEFAULT_BRANDING } from "./branding";

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
  /** Why the correct option is the professional answer. */
  rationale?: string;
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
const SYSTEM_PROMPT = `You are a senior instructional designer writing a business-grade course for working professionals.

Your task: turn the source material into a full course for the client named in CLIENT BRANDING. Research the governing standards, recognised practice, and operational consequences of the subject. Do not stop at a summary of the notes. Do not attribute the course to a different organisation.

RULES:
1. Create 3 to 5 modules. Each module is a complete lesson of about 15–20 minutes, not an overview.
2. Each module MUST start with EXACTLY 3 measurable learning objectives. Each objective must begin with "By the end of this module, learners will be able to..." followed by a Bloom's taxonomy verb (identify, apply, analyze, evaluate, draft, assess). Do NOT skip this field.
3. Each module must have 6 content cards. Each card is ONE teaching block of 80–140 words of continuous prose. A card must contain all four of these, in this order: the professional point; the authority (name the standard, article, section, or recognised practice, and what it actually requires); a concrete workplace example with roles and a decision; and what the learner does differently on the job. Do not write a card of one or two sentences. Do not use slogans, filler, or a heading-only card.
4. Across the six cards, cover six different jobs of work, in this order: why it matters in the learner's role; the governing rule and who it binds; how the control works; a worked example; a common failure and its consequence; the decision standard the learner will be held to. Do not repeat the same point in a new sentence.
5. Each module must have ONE branching scenario with exactly 2 options (one correct, one incorrect). The prompt is a full case of 70–120 words: the role, the facts, the pressure, and the decision. Each option is a professional action. Each feedback note is 40–70 words and explains the standard and the consequence. Do not write a one-line riddle.
6. Each module must have 2-3 quiz questions with 4 options each. Every question is a short case, not a definition. Include a rationale of 30–50 words that explains why the correct option is the professional answer.
7. Use the authoritative frameworks that match the subject. Cite them by name. Do not invent article numbers, statute citations, fines, or statistics that are not in the source or in the selected domain guidance. If you need an illustration and the source has no figure, label it as an illustration. Do not add ECOFEL or Egmont Group citations unless that organisation is the client or the source material requires it.
8. Use the terminology of the subject matter correctly. Do not import another organisation's programme name or AML/FIU terms unless the source or the selected domain calls for them.
9. Language must be precise enough for a compliance, audit, or management review.
10. Stay with the frameworks named in the source material and the selected domain.
11. Always respond with valid JSON only — no markdown, no explanations, no code fences.

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
      "description": "string (3-4 sentences: who it is for, what they will be able to do, and the standards it teaches)",
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
        "prompt": "string (the scenario setup — realistic for this client's learners)",
        "options": [
          { "id": "a", "text": "string", "isCorrect": false, "feedback": "string" },
          { "id": "b", "text": "string", "isCorrect": true, "feedback": "string" }
        ]
      },
      "quiz": [
        { "question": "string (a short case)", "options": ["a", "b", "c", "d"], "correctIndex": 0, "rationale": "string (why the correct option is the professional answer)" }
      ]
    }
  ]
}`;


// ============================================================
// DYNAMIC SYSTEM PROMPT — respects user-selected size/quiz depth
// ============================================================
function buildSystemPrompt(
  settings: CourseSettings,
  templateId?: string
): string {
  const targetModules = resolveModuleCount(settings);
  const targetQuiz = resolveQuizPerModule(settings);
  const targetCards = CARDS_PER_MODULE;

  // Prepend a loud, unmissable mandate with exact counts
  const mandate = `\n=== MANDATORY COUNTS FOR THIS GENERATION ===\n` +
    `- Total modules: EXACTLY ${targetModules}\n` +
    `- Content cards per module: EXACTLY ${targetCards}\n` +
    `- Quiz questions per module: EXACTLY ${targetQuiz}\n` +
    `- Learning objectives per module: EXACTLY 3\n` +
    `- Branching scenarios: EXACTLY 1 per module (2 options each)\n` +
    `Do NOT produce fewer than these counts. Do NOT merge modules. Do NOT create filler conclusion modules.\n` +
    `=============================================\n\n`;

  let prompt = mandate + SYSTEM_PROMPT
    .replace(
      /1\. Create 3 to 5 modules[^\n]*/,
      `1. Create EXACTLY ${targetModules} modules. Each module is a complete lesson of about 15–20 minutes, not an overview.`
    )
    .replace(
      /3\. Each module must have 6 content cards[^\n]*/,
      `3. Each module MUST have EXACTLY ${targetCards} content cards. Each card is 80–140 words and teaches a different part of the lesson: the point, the named authority, a workplace example, and the action on the job. Do not write a thin card.`
    )
    .replace(
      /6\. Each module must have 2-3 quiz questions[^\n]*/,
      `6. Each module MUST have EXACTLY ${targetQuiz} quiz question(s) with 4 options each. Every question is a short case, not a definition. Include a rationale of 30–50 words.`
    );

  // Append template-specific guidance if a template is selected
  if (templateId && templateId !== "custom") {
    const template = getTemplate(templateId);
    if (template.systemPromptSuffix) {
      prompt += "\n" + template.systemPromptSuffix;
    }
  }

  const client = settings.branding ?? DEFAULT_BRANDING;
  prompt += `\n\nCLIENT BRANDING FOR THIS COURSE:\n` +
    `- Client name: ${client.clientName}\n` +
    `- Official website: ${client.websiteUrl || "not provided"}\n` +
    `- Write the course as material produced for ${client.clientName}.\n` +
    `- Use that name wherever the programme owner is mentioned.\n` +
    `- Do not name ECOFEL, the Egmont Group, or any other organisation as the owner unless it is the client above or the source material requires the citation.\n`;

  return prompt;
}

function courseRequest(sourceText: string, settings: CourseSettings): string {
  if (sourceText.startsWith("Your previous output FAILED")) return sourceText;
  const client = settings.branding ?? DEFAULT_BRANDING;
  const site = client.websiteUrl ? ` Official website: ${client.websiteUrl}.` : "";
  return `Write a full professional course for ${client.clientName}, not a summary of the notes.${site} Research the standards that govern this subject and teach them with worked examples. Attribute the programme only to ${client.clientName}.\n\n${sourceText}`;
}

// ============================================================
// OLLAMA PROVIDER
// ============================================================
async function generateWithOllama(
  sourceText: string,
  settings: CourseSettings = DEFAULT_SETTINGS,
  templateId?: string
): Promise<GeneratedCourse> {
  const response = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      stream: false,
      format: "json",
      messages: [
        { role: "system", content: buildSystemPrompt(settings, templateId) },
        {
          role: "user",
          content: courseRequest(sourceText, settings),
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
  settings: CourseSettings = DEFAULT_SETTINGS,
  templateId?: string
): Promise<GeneratedCourse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !apiKey.startsWith("sk-")) {
    throw new Error("OPENAI_API_KEY missing or invalid in .env.local");
  }

  const openai = new OpenAI({ apiKey });

  const response = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    response_format: { type: "json_object" },
    temperature: 0.4,
    max_tokens: 12000,
    messages: [
      { role: "system", content: buildSystemPrompt(settings, templateId) },
      {
        role: "user",
        content: courseRequest(sourceText, settings),
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
  retryPrompt: string,
  settings: CourseSettings,
  templateId?: string
): Promise<GeneratedCourse> {
  return generateWithOpenAI(retryPrompt, settings, templateId);
}


// ============================================================
// MAIN ENTRYPOINT — switch on AI_MODE
// ============================================================
export async function generateCourse(
  sourceText: string,
  options?: { maxRetries?: number; settings?: CourseSettings; templateId?: string }
): Promise<GeneratedCourse & { _quality?: { score: number; attempts: number; failures: string[] } }> {
  const maxRetries = options?.maxRetries ?? 2;
  const settings = options?.settings ?? DEFAULT_SETTINGS;
  const templateId = options?.templateId;

  // Hybrid: local Llama first, cloud retry. Local: always local. Else: always cloud.
  const provider = (AI_MODE === "local" || AI_MODE === "hybrid")
    ? generateWithOllama
    : generateWithOpenAI;

  // --- Attempt 1 ---
  let course = await provider(sourceText, settings, templateId);
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
        ? await retryWithCloud(retryPrompt, settings, templateId)
        : await provider(retryPrompt, settings, templateId);
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
