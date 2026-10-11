import type { GeneratedCourse } from "./ai";

// Brand colors
const BRAND = {
  primary: "10B981", // emerald green
  dark: "0F172A",
  light: "F8FAFC",
  muted: "64748B",
  accent: "F59E0B",
};

export async function buildPresentation(course: GeneratedCourse): Promise<Blob> {
  // Dynamic import so pptxgenjs is only loaded when needed
  const PptxGenJS = (await import("pptxgenjs")).default;
  const pptx = new PptxGenJS();

  pptx.layout = "LAYOUT_WIDE"; // 16:9 widescreen
  pptx.author = "Course Factory AI";
  pptx.company = "Course Factory";
  pptx.title = course.title;

  // ============================================================
  // SLIDE 1 — Title
  // ============================================================
  const titleSlide = pptx.addSlide();
  titleSlide.background = { color: BRAND.dark };
  titleSlide.addText("TRAINING COURSE", {
    x: 0.5, y: 1.5, w: 12, h: 0.5,
    fontSize: 16, color: BRAND.primary, bold: true, align: "center",
    charSpacing: 4,
  });
  titleSlide.addText(course.title, {
    x: 0.5, y: 2.2, w: 12, h: 1.5,
    fontSize: 40, color: "FFFFFF", bold: true, align: "center",
  });
  titleSlide.addText(course.description || "", {
    x: 1.5, y: 4, w: 10, h: 1,
    fontSize: 18, color: "CBD5E1", align: "center", italic: true,
  });
  titleSlide.addText(
    `${course.modules.length} modules  ·  ${course.modules.reduce((n, m) => n + m.content.length, 0)} content cards  ·  ${course.modules.reduce((n, m) => n + m.quiz.length, 0)} quiz questions`,
    {
      x: 0.5, y: 5.2, w: 12, h: 0.5,
      fontSize: 14, color: BRAND.primary, align: "center",
    }
  );
  titleSlide.addText(
    `Estimated duration: ${course.estimatedDuration || "Not specified"}`,
    {
      x: 0.5, y: 5.8, w: 12, h: 0.5,
      fontSize: 12, color: BRAND.muted, align: "center",
    }
  );

  // ============================================================
  // SLIDE 2 — Agenda
  // ============================================================
  const agenda = pptx.addSlide();
  agenda.background = { color: BRAND.light };
  agenda.addText("Agenda", {
    x: 0.5, y: 0.3, w: 12, h: 0.7,
    fontSize: 32, color: BRAND.dark, bold: true,
  });
  const agendaItems = course.modules.map((m, i) => ({
    text: `Module ${i + 1}:  ${m.title}`,
    options: { fontSize: 18, color: BRAND.dark, breakLine: true, paraSpaceAfter: 8 },
  }));
  agenda.addText(agendaItems, {
    x: 0.8, y: 1.5, w: 11.5, h: 5,
    bullet: { code: "25CF" },
  });

  // ============================================================
  // MODULES
  // ============================================================
  course.modules.forEach((mod, idx) => {
    // ----- Module intro slide -----
    const modSlide = pptx.addSlide();
    modSlide.background = { color: BRAND.dark };
    modSlide.addText(`MODULE ${idx + 1}`, {
      x: 0.5, y: 0.5, w: 12, h: 0.4,
      fontSize: 14, color: BRAND.primary, bold: true, charSpacing: 4,
    });
    modSlide.addText(mod.title, {
      x: 0.5, y: 1.1, w: 12, h: 1.2,
      fontSize: 32, color: "FFFFFF", bold: true,
    });

    if (mod.learningObjectives && mod.learningObjectives.length > 0) {
      modSlide.addText("Learning Objectives", {
        x: 0.5, y: 2.7, w: 12, h: 0.4,
        fontSize: 14, color: BRAND.primary, bold: true, italic: true,
      });
      modSlide.addText(
        mod.learningObjectives.map((o) => ({
          text: o,
          options: { fontSize: 14, color: "CBD5E1", breakLine: true, paraSpaceAfter: 6 },
        })),
        { x: 0.8, y: 3.2, w: 11.5, h: 2.5, bullet: true }
      );
    }

    // ----- Content slides (one per 2-3 cards, to avoid overflow) -----
    const cardsPerSlide = 3;
    for (let i = 0; i < mod.content.length; i += cardsPerSlide) {
      const chunk = mod.content.slice(i, i + cardsPerSlide);
      const contentSlide = pptx.addSlide();
      contentSlide.background = { color: BRAND.light };
      contentSlide.addText(`Module ${idx + 1}: ${mod.title}`, {
        x: 0.5, y: 0.3, w: 12, h: 0.5,
        fontSize: 16, color: BRAND.muted, italic: true,
      });
      contentSlide.addText(chunk.map((c) => ({
        text: c,
        options: { fontSize: 14, color: BRAND.dark, breakLine: true, paraSpaceAfter: 14 },
      })), {
        x: 0.8, y: 1.2, w: 11.5, h: 5.5,
        bullet: { code: "25CF" },
      });
    }

    // ----- Scenario slide -----
    if (mod.scenario) {
      const scenarioSlide = pptx.addSlide();
      scenarioSlide.background = { color: BRAND.light };
      scenarioSlide.addText("BRANCHING SCENARIO", {
        x: 0.5, y: 0.3, w: 12, h: 0.4,
        fontSize: 12, color: BRAND.accent, bold: true, charSpacing: 3,
      });
      scenarioSlide.addText(`Module ${idx + 1}`, {
        x: 0.5, y: 0.7, w: 12, h: 0.3,
        fontSize: 12, color: BRAND.muted, italic: true,
      });
      scenarioSlide.addText(mod.scenario.prompt, {
        x: 0.5, y: 1.2, w: 12, h: 1.5,
        fontSize: 16, color: BRAND.dark, bold: true,
      });

      // Show both options with correct one highlighted
      mod.scenario.options.forEach((opt, i) => {
        const yPos = 3 + i * 1.2;
        const isCorrect = opt.isCorrect;
        scenarioSlide.addShape("rect", {
          x: 0.5, y: yPos, w: 12, h: 1,
          fill: { color: isCorrect ? "D1FAE5" : "F1F5F9" },
          line: { color: isCorrect ? BRAND.primary : "E2E8F0", width: 1 },
        });
        scenarioSlide.addText(
          `${String.fromCharCode(65 + i)}.  ${isCorrect ? "✓" : "○"}  ${opt.text}`,
          {
            x: 0.7, y: yPos + 0.15, w: 11.6, h: 0.7,
            fontSize: 13, color: BRAND.dark, bold: isCorrect,
          }
        );
      });

      // Feedback at bottom
      const correctOpt = mod.scenario.options.find((o) => o.isCorrect);
      if (correctOpt?.feedback) {
        scenarioSlide.addText(`Correct answer feedback: ${correctOpt.feedback}`, {
          x: 0.5, y: 5.6, w: 12, h: 0.7,
          fontSize: 11, color: BRAND.muted, italic: true,
        });
      }
    }

    // ----- Quiz slides (one per question) -----
    mod.quiz.forEach((q, qIdx) => {
      const quizSlide = pptx.addSlide();
      quizSlide.background = { color: BRAND.light };
      quizSlide.addText(`QUIZ — Module ${idx + 1}`, {
        x: 0.5, y: 0.3, w: 12, h: 0.4,
        fontSize: 12, color: BRAND.accent, bold: true, charSpacing: 3,
      });
      quizSlide.addText(`Question ${qIdx + 1} of ${mod.quiz.length}`, {
        x: 0.5, y: 0.7, w: 12, h: 0.3,
        fontSize: 11, color: BRAND.muted,
      });
      quizSlide.addText(q.question, {
        x: 0.5, y: 1.2, w: 12, h: 1.3,
        fontSize: 18, color: BRAND.dark, bold: true,
      });

      q.options.forEach((opt, i) => {
        const isCorrect = i === q.correctIndex;
        const yPos = 3 + i * 0.75;
        quizSlide.addShape("rect", {
          x: 0.5, y: yPos, w: 12, h: 0.6,
          fill: { color: isCorrect ? "D1FAE5" : "F1F5F9" },
          line: { color: isCorrect ? BRAND.primary : "E2E8F0", width: 1 },
        });
        quizSlide.addText(
          `${String.fromCharCode(65 + i)}.  ${opt}`,
          {
            x: 0.7, y: yPos + 0.05, w: 11.6, h: 0.5,
            fontSize: 13, color: BRAND.dark, bold: isCorrect,
          }
        );
      });
    });
  });

  // ============================================================
  // FINAL SLIDE — Summary & References
  // ============================================================
  const summary = pptx.addSlide();
  summary.background = { color: BRAND.dark };
  summary.addText("Course Complete", {
    x: 0.5, y: 0.5, w: 12, h: 0.8,
    fontSize: 32, color: "FFFFFF", bold: true, align: "center",
  });
  summary.addText("Key References and Standards", {
    x: 0.5, y: 2, w: 12, h: 0.5,
    fontSize: 20, color: BRAND.primary, bold: true, align: "center",
  });
  summary.addText([
    { text: "FATF Recommendations (Financial Action Task Force)", options: { bullet: true, color: "CBD5E1", fontSize: 16, breakLine: true } },
    { text: "Egmont Group Principles for Information Exchange", options: { bullet: true, color: "CBD5E1", fontSize: 16, breakLine: true } },
    { text: "ECOFEL Certification Program (ECP) Standards", options: { bullet: true, color: "CBD5E1", fontSize: 16, breakLine: true } },
    { text: "National Risk Assessment (NRA) Methodology", options: { bullet: true, color: "CBD5E1", fontSize: 16, breakLine: true } },
    { text: "Risk-Based Approach (RBA) Framework", options: { bullet: true, color: "CBD5E1", fontSize: 16, breakLine: true } },
  ], {
    x: 2.5, y: 3, w: 8, h: 3,
  });
  summary.addText("Generated by Course Factory AI", {
    x: 0.5, y: 6.7, w: 12, h: 0.3,
    fontSize: 11, color: BRAND.muted, italic: true, align: "center",
  });

  // ============================================================
  // EXPORT
  // ============================================================
  const blob = (await pptx.write({ outputType: "blob" })) as Blob;
  return blob;
}

export function downloadPresentation(blob: Blob, courseTitle: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${courseTitle.replace(/\s+/g, "-").toLowerCase()}-slides.pptx`;
  a.click();
  URL.revokeObjectURL(url);
}
