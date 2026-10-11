import { type Branding, DEFAULT_BRANDING, brandHex, onBrandText, resolvePalette, websiteHref } from "./branding";
import { fitBox, loadLogo } from "./logo";
import pptxgen from "pptxgenjs";
import type { GeneratedCourse } from "./ai";

function sentencesOf(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);
}

function clip(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.55 ? cut.slice(0, space) : cut).replace(/[,:;–-]\s*$/, "")}…`;
}

/** Percentages the lesson actually names. Never invented. */
function namedPercents(text: string): { label: string; value: number }[] {
  const found: { label: string; value: number }[] = [];
  const pattern = /(\d+(?:\.\d+)?)\s*%(?:\s+of)?\s+([^,.;]{3,42})/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) && found.length < 4) {
    const value = Number(match[1]);
    if (!Number.isFinite(value) || value <= 0 || value > 100) continue;
    const label = match[2].replace(/\s+/g, " ").trim() || `Item ${found.length + 1}`;
    if (found.some((item) => item.label.toLowerCase() === label.toLowerCase())) continue;
    found.push({ label, value });
  }
  return found.length >= 2 ? found : [];
}

function stepLabel(text: string): string {
  const first = sentencesOf(text)[0] || text;
  return first
    .replace(/[^A-Za-z0-9 ]/g, " ")
    .trim()
    .split(/\s+/)
    .slice(0, 4)
    .join(" ");
}

function spokenObjective(text: string): string {
  const line = text
    .replace(/^By the end of this module, learners will be able to\s+/i, "")
    .replace(/\.$/, "");
  return line.charAt(0).toUpperCase() + line.slice(1);
}

/**
 * Builds an instructor PowerPoint from a generated course.
 * Slides carry one idea in presentation type. The full teaching sits in the notes.
 * A chart appears only when the lesson itself names two or more percentages.
 */
export async function buildPptx(course: GeneratedCourse, branding?: Branding): Promise<Blob> {
  const b = branding ?? DEFAULT_BRANDING;
  const pptx = new pptxgen();
  const palette = resolvePalette(b);
  const brand = brandHex(palette.primary);
  const accent = brandHex(palette.accent);
  const dark = brandHex(palette.dark);
  const paper = brandHex(palette.paper);
  const bodyInk = brandHex(palette.ink);
  const ink = onBrandText(palette.primary);
  const logo = await loadLogo(b.logoUrl);
  const site = websiteHref(b.websiteUrl);

  // Presentation-wide settings
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = b.clientName || "Course Factory";
  pptx.company = b.clientName || "Course Factory";
  pptx.title = course.title;
  pptx.subject = b.websiteUrl || course.title;

  const placeLogo = (
    slide: pptxgen.Slide,
    opts: { x?: number; y: number; maxW: number; maxH: number; align?: "left" | "right" | "center" }
  ) => {
    if (!logo) return { w: 0, h: 0 };
    const box = fitBox(logo.width, logo.height, opts.maxW, opts.maxH);
    const w = box.width / 96;
    const h = box.height / 96;
    const x =
      opts.align === "right"
        ? 13.33 - w - 0.4
        : opts.align === "center"
          ? (13.33 - w) / 2
          : (opts.x ?? 0.4);
    const y = opts.y;
    slide.addShape(pptx.ShapeType.rect, {
      x: x - 0.05,
      y: y - 0.04,
      w: w + 0.1,
      h: h + 0.08,
      fill: { color: "FFFFFF" },
      line: { color: "E5E7EB", width: 0.5 },
    });
    slide.addImage({ data: logo.dataUri, x, y, w, h });
    return { w, h };
  };

  const stamp = (slide: pptxgen.Slide) => {
    slide.background = { color: paper };
    slide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 1.32,
      w: 13.33,
      h: 0.06,
      fill: { color: accent },
      line: { color: accent, width: 0 },
    });
    placeLogo(slide, { x: 0.42, y: 0.16, maxW: 160, maxH: 108 });
    if (site) {
      slide.addText(site.replace(/\/$/, ""), {
        x: 5.6,
        y: 0.42,
        w: 7.3,
        h: 0.36,
        fontSize: 14,
        color: brand,
        align: "right",
        underline: { style: "sng", color: brand },
        hyperlink: { url: site },
      });
    }
    if (b.footerText) {
      slide.addText(b.footerText, {
        x: 0.4,
        y: 7.08,
        w: 12.5,
        h: 0.24,
        fontSize: 10,
        color: dark,
      });
    }
  };

  const accentBand = (slide: pptxgen.Slide) => {
    slide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 7.22,
      w: 13.33,
      h: 0.28,
      fill: { color: accent },
      line: { color: accent, width: 0 },
    });
  };

  // ============ SLIDE 1: TITLE ============
  const titleSlide = pptx.addSlide();
  titleSlide.background = { color: brand };
  placeLogo(titleSlide, { y: 0.35, maxW: 210, maxH: 190, align: "center" });
  titleSlide.addText(b.clientName, {
    x: 0.5,
    y: 2.45,
    w: 12.3,
    h: 0.4,
    fontSize: 18,
    bold: true,
    color: ink,
    align: "center",
  });
  if (site) {
    titleSlide.addText(site, {
      x: 0.5,
      y: 2.88,
      w: 12.3,
      h: 0.32,
      fontSize: 14,
      color: ink,
      align: "center",
      underline: { style: "sng", color: ink },
      hyperlink: { url: site },
    });
  }
  titleSlide.addText(course.title, {
    x: 0.5,
    y: 3.4,
    w: 12,
    h: 1.5,
    fontSize: 40,
    bold: true,
    color: ink,
    align: "center",
  });
  titleSlide.addText(course.description || "", {
    x: 1,
    y: 4.7,
    w: 11,
    h: 1,
    fontSize: 16,
    color: ink,
    align: "center",
    italic: true,
  });
  accentBand(titleSlide);
  titleSlide.addText(
    `Target Audience: ${course.targetAudience || "General"}\n` +
      `Estimated Duration: ${course.estimatedDuration || "—"}`,
    {
      x: 1,
      y: 5.9,
      w: 11,
      h: 1,
      fontSize: 18,
      color: ink,
      align: "center",
    }
  );

  const card = (
    slide: pptxgen.Slide,
    x: number,
    y: number,
    w: number,
    h: number,
    border: string
  ) => {
    slide.addShape(pptx.ShapeType.roundRect, {
      x,
      y,
      w,
      h,
      fill: { color: "FFFFFF" },
      line: { color: border, width: 1.5 },
      rectRadius: 0.1,
    });
  };

  // ============ SLIDE 2: AGENDA ============
  const agendaSlide = pptx.addSlide();
  agendaSlide.addText("Agenda", {
    x: 0.45,
    y: 1.42,
    w: 12,
    h: 0.55,
    fontSize: 36,
    bold: true,
    color: brand,
  });
  const moduleCount = course.modules.length;
  if (moduleCount > 0 && moduleCount <= 9) {
    const cols = moduleCount <= 3 ? moduleCount : moduleCount <= 4 ? 2 : 3;
    const rows = Math.ceil(moduleCount / cols);
    const gap = 0.18;
    const tileW = (12.4 - gap * (cols - 1)) / cols;
    const tileH = Math.min(1.85, (4.7 - gap * (rows - 1)) / rows);
    course.modules.forEach((mod, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = 0.45 + col * (tileW + gap);
      const y = 2.15 + row * (tileH + gap);
      card(agendaSlide, x, y, tileW, tileH, accent);
      agendaSlide.addText(String(i + 1).padStart(2, "0"), {
        x: x + 0.18,
        y: y + 0.12,
        w: tileW - 0.36,
        h: 0.34,
        fontSize: 16,
        bold: true,
        color: accent,
      });
      agendaSlide.addText(mod.title, {
        x: x + 0.18,
        y: y + 0.48,
        w: tileW - 0.36,
        h: tileH - 0.62,
        fontSize: moduleCount > 6 ? 16 : 20,
        bold: true,
        color: dark,
        valign: "top",
      });
    });
  }
  stamp(agendaSlide);

  // ============ SLIDES PER MODULE ============
  course.modules.forEach((mod, mi) => {
    const divider = pptx.addSlide();
    divider.background = { color: brand };
    placeLogo(divider, { x: 0.55, y: 0.32, maxW: 180, maxH: 110 });
    accentBand(divider);
    divider.addText(`Module ${mi + 1} of ${course.modules.length}`, {
      x: 0.7,
      y: 2.35,
      w: 11.8,
      h: 0.4,
      fontSize: 20,
      bold: true,
      color: ink,
    });
    divider.addText(mod.title, {
      x: 0.7,
      y: 2.9,
      w: 11.8,
      h: 2.2,
      fontSize: 40,
      bold: true,
      color: ink,
    });

    if (mod.learningObjectives && mod.learningObjectives.length > 0) {
      const objectiveSlide = pptx.addSlide();
      objectiveSlide.addText("By the end of this module", {
        x: 0.45,
        y: 1.42,
        w: 12.4,
        h: 0.55,
        fontSize: 32,
        bold: true,
        color: brand,
      });
      mod.learningObjectives.slice(0, 4).forEach((objective, oi) => {
        const y = 2.2 + oi * 1.15;
        objectiveSlide.addShape(pptx.ShapeType.ellipse, {
          x: 0.5,
          y: y,
          w: 0.62,
          h: 0.62,
          fill: { color: oi % 2 === 0 ? brand : accent },
          line: { color: oi % 2 === 0 ? brand : accent, width: 0 },
        });
        objectiveSlide.addText(String(oi + 1), {
          x: 0.5,
          y: y + 0.08,
          w: 0.62,
          h: 0.46,
          fontSize: 20,
          bold: true,
          align: "center",
          color: oi % 2 === 0 ? ink : onBrandText(palette.accent),
        });
        objectiveSlide.addText(spokenObjective(objective), {
          x: 1.4,
          y: y,
          w: 11.2,
          h: 1,
          fontSize: 22,
          color: bodyInk,
          valign: "middle",
        });
      });
      objectiveSlide.addNotes(mod.learningObjectives.join("\n"));
      stamp(objectiveSlide);
    }

    if (mod.content.length > 1) {
      const path = pptx.addSlide();
      path.addText("How this lesson moves", {
        x: 0.45,
        y: 1.42,
        w: 12.4,
        h: 0.6,
        fontSize: 32,
        bold: true,
        color: brand,
      });
      const steps = mod.content.slice(0, 6);
      const colW = 12.4 / steps.length;
      path.addShape(pptx.ShapeType.rect, {
        x: 0.7,
        y: 3.42,
        w: 11.9,
        h: 0.07,
        fill: { color: accent },
        line: { color: accent, width: 0 },
      });
      steps.forEach((step, si) => {
        const x = 0.45 + si * colW;
        path.addShape(pptx.ShapeType.ellipse, {
          x: x + (colW - 0.78) / 2,
          y: 3.08,
          w: 0.78,
          h: 0.78,
          fill: { color: si % 2 === 0 ? brand : accent },
          line: { color: "FFFFFF", width: 1.5 },
        });
        path.addText(String(si + 1), {
          x: x + (colW - 0.78) / 2,
          y: 3.22,
          w: 0.78,
          h: 0.5,
          fontSize: 22,
          bold: true,
          align: "center",
          color: si % 2 === 0 ? ink : onBrandText(palette.accent),
        });
        path.addText(stepLabel(step), {
          x: x + 0.06,
          y: 4.05,
          w: colW - 0.12,
          h: 1.5,
          fontSize: 16,
          bold: true,
          align: "center",
          color: dark,
        });
      });
      path.addNotes(mod.content.map((step, si) => `${si + 1}. ${step}`).join("\n\n"));
      stamp(path);
    }

    mod.content.forEach((lesson, ci) => {
      const contentSlide = pptx.addSlide();
      const parts = sentencesOf(lesson);
      const headline = clip(parts[0] || lesson, 120);
      const rest = parts.slice(1);
      const figures = namedPercents(lesson);
      contentSlide.addText(mod.title, {
        x: 0.45,
        y: 1.4,
        w: 9.6,
        h: 0.32,
        fontSize: 16,
        bold: true,
        color: accent,
      });
      contentSlide.addText(`${ci + 1}  /  ${mod.content.length}`, {
        x: 10.1,
        y: 1.4,
        w: 2.7,
        h: 0.32,
        fontSize: 16,
        bold: true,
        color: accent,
        align: "right",
      });
      contentSlide.addNotes(lesson);

      if (figures.length >= 2) {
        contentSlide.addText(headline, {
          x: 0.45,
          y: 1.85,
          w: 6.2,
          h: 1.8,
          fontSize: 28,
          bold: true,
          color: brand,
        });
        if (rest[0]) {
          contentSlide.addText(clip(rest[0], 200), {
            x: 0.45,
            y: 3.8,
            w: 6.2,
            h: 2.5,
            fontSize: 20,
            color: bodyInk,
          });
        }
        contentSlide.addChart(pptx.ChartType.bar, [
          {
            name: "Named in the lesson",
            labels: figures.map((figure) => clip(figure.label, 28).replace(/…$/, "")),
            values: figures.map((figure) => figure.value),
          },
        ], {
          x: 6.85,
          y: 1.8,
          w: 6,
          h: 4.7,
          barGrouping: "clustered",
          showLegend: false,
          showValue: true,
          showTitle: false,
          chartColors: [brand],
          catAxisLabelColor: bodyInk,
          catAxisLabelFontSize: 12,
          valAxisMaxVal: 100,
          dataLabelFontSize: 14,
          dataLabelColor: dark,
        });
      } else {
        contentSlide.addText(headline, {
          x: 0.45,
          y: 1.85,
          w: 12.4,
          h: rest.length ? 1.4 : 3.4,
          fontSize: rest.length ? 30 : 36,
          bold: true,
          color: brand,
        });
        const points = rest.slice(0, 3);
        if (points.length === 1) {
          contentSlide.addText(clip(points[0], 240), {
            x: 0.45,
            y: 3.5,
            w: 12.4,
            h: 2.8,
            fontSize: 22,
            color: bodyInk,
          });
        } else if (points.length > 1) {
          const gap = 0.2;
          const tileW = (12.4 - gap * (points.length - 1)) / points.length;
          points.forEach((point, pi) => {
            const x = 0.45 + pi * (tileW + gap);
            card(contentSlide, x, 3.45, tileW, 3.05, pi === 0 ? brand : accent);
            contentSlide.addText(String(pi + 1).padStart(2, "0"), {
              x: x + 0.2,
              y: 3.6,
              w: tileW - 0.4,
              h: 0.38,
              fontSize: 16,
              bold: true,
              color: accent,
            });
            contentSlide.addText(clip(point, 150), {
              x: x + 0.2,
              y: 4.08,
              w: tileW - 0.4,
              h: 2.15,
              fontSize: 18,
              color: bodyInk,
              valign: "top",
            });
          });
        }
      }
      stamp(contentSlide);
    });

    if (mod.scenario?.prompt) {
      const scenarioSlide = pptx.addSlide();
      const parts = sentencesOf(mod.scenario.prompt);
      const ask = parts.length > 1 ? parts[parts.length - 1] : mod.scenario.prompt;
      const situation = parts.length > 1 ? parts.slice(0, -1).join(" ") : "";
      scenarioSlide.addText("A decision", {
        x: 0.45,
        y: 1.4,
        w: 12.4,
        h: 0.36,
        fontSize: 16,
        bold: true,
        color: accent,
      });
      if (situation) {
        scenarioSlide.addText(clip(situation, 220), {
          x: 0.45,
          y: 1.85,
          w: 12.4,
          h: 1.35,
          fontSize: 20,
          color: bodyInk,
        });
      }
      scenarioSlide.addText(clip(ask, 180), {
        x: 0.45,
        y: situation ? 3.25 : 1.9,
        w: 12.4,
        h: 1.15,
        fontSize: 26,
        bold: true,
        color: brand,
      });
      const options = mod.scenario.options.slice(0, 2);
      const gap = 0.24;
      const tileW = (12.4 - gap * Math.max(options.length - 1, 0)) / Math.max(options.length, 1);
      options.forEach((option, oi) => {
        const x = 0.45 + oi * (tileW + gap);
        card(scenarioSlide, x, 4.6, tileW, 2.15, option.isCorrect ? accent : "E5E7EB");
        scenarioSlide.addText(option.isCorrect ? "Professional response" : "Other response", {
          x: x + 0.2,
          y: 4.72,
          w: tileW - 0.4,
          h: 0.32,
          fontSize: 14,
          bold: true,
          color: option.isCorrect ? accent : "6B7280",
        });
        scenarioSlide.addText(clip(option.text, 140), {
          x: x + 0.2,
          y: 5.08,
          w: tileW - 0.4,
          h: 1.45,
          fontSize: 18,
          color: bodyInk,
        });
      });
      scenarioSlide.addNotes(
        [
          mod.scenario.prompt,
          ...mod.scenario.options.map(
            (option) =>
              `${option.isCorrect ? "Professional response" : "Other response"}: ${option.text}${option.feedback ? `\n${option.feedback}` : ""}`
          ),
        ].join("\n\n")
      );
      stamp(scenarioSlide);
    }

    mod.quiz.forEach((question, qi) => {
      const quizSlide = pptx.addSlide();
      quizSlide.addText(`Knowledge check  ${qi + 1}  /  ${mod.quiz.length}`, {
        x: 0.45,
        y: 1.4,
        w: 12.4,
        h: 0.34,
        fontSize: 16,
        bold: true,
        color: accent,
      });
      quizSlide.addText(question.question, {
        x: 0.45,
        y: 1.82,
        w: 12.4,
        h: 1.35,
        fontSize: 26,
        bold: true,
        color: brand,
      });
      question.options.slice(0, 4).forEach((option, oi) => {
        const y = 3.3 + oi * 0.85;
        const correct = oi === question.correctIndex;
        card(quizSlide, 0.45, y, 12.4, 0.74, correct ? accent : "E5E7EB");
        quizSlide.addText(`${String.fromCharCode(65 + oi)}    ${clip(option, 110)}`, {
          x: 0.7,
          y: y + 0.1,
          w: 11.9,
          h: 0.54,
          fontSize: 18,
          bold: correct,
          color: correct ? brand : bodyInk,
          valign: "middle",
        });
      });
      quizSlide.addNotes(
        `Answer: ${question.options[question.correctIndex] || "—"}${question.rationale ? `\n\n${question.rationale}` : ""}`
      );
      stamp(quizSlide);
    });
  });

  // ============ FINAL SLIDE: REFERENCES ============
  const endSlide = pptx.addSlide();
  endSlide.background = { color: brand };
  placeLogo(endSlide, { y: 0.4, maxW: 200, maxH: 170, align: "center" });
  accentBand(endSlide);
  endSlide.addText("Thank You", {
    x: 0.5,
    y: 2.35,
    w: 12,
    h: 1,
    fontSize: 36,
    bold: true,
    color: ink,
    align: "center",
  });
  if (site) {
    endSlide.addText(site, {
      x: 1,
      y: 3.35,
      w: 11.3,
      h: 0.4,
      fontSize: 16,
      color: ink,
      align: "center",
      underline: { style: "sng", color: ink },
      hyperlink: { url: site },
    });
  }
  endSlide.addText([b.clientName, b.footerText].filter(Boolean).join("\n"), {
    x: 1,
    y: 3.85,
    w: 11.3,
    h: 1.2,
    fontSize: 16,
    color: ink,
    align: "center",
  });

  // Generate as blob
  const blob = (await pptx.write({ outputType: "blob" })) as Blob;
  return blob;
}

export async function downloadPptx(course: GeneratedCourse, branding?: Branding): Promise<void> {
  const b = branding ?? DEFAULT_BRANDING;
  const blob = await buildPptx(course, branding);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const safeTitle = `${b.clientName}-${course.title}`.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
  a.download = `${safeTitle}-slides.pptx`;
  a.click();
  URL.revokeObjectURL(url);
}
