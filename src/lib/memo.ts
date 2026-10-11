import { type Branding, DEFAULT_BRANDING, buildFooter, websiteHref } from "./branding";
import { cachedLogoDataUrl } from "./brandStore";
import type { GeneratedCourse } from "./ai";

/**
 * Builds a professional training memorandum in Markdown format
 * from a generated course. Suitable for trainers, managers, and auditors.
 */
export function generateMemo(course: GeneratedCourse, branding?: Branding): string {
  const b = branding ?? DEFAULT_BRANDING;
  const site = websiteHref(b.websiteUrl);

  const logoSrc = b.logoUrl?.startsWith("data:")
    ? b.logoUrl
    : cachedLogoDataUrl(b.logoUrl) || (b.logoUrl && /^https?:\/\//i.test(b.logoUrl) ? b.logoUrl : "");
  const brandingHeader = [
    logoSrc ? `![${b.clientName} logo](${logoSrc})` : "",
    `# ${b.clientName}`,
    "",
    `_Prepared for: ${b.clientName}_`,
    site ? `**Website:** [${site.replace(/\/$/, "")}](${site})` : "",
    "",
  ]
    .filter((line, index, all) => line !== "" || all[index - 1] !== "")
    .join("\n") + "\n";
  const now = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const totalCards = course.modules.reduce(
    (sum, m) => sum + (m.content?.length || 0),
    0
  );
  const totalQuiz = course.modules.reduce(
    (sum, m) => sum + (m.quiz?.length || 0),
    0
  );
  const totalObjectives = course.modules.reduce(
    (sum, m) => sum + (m.learningObjectives?.length || 0),
    0
  );

  const lines: string[] = [];

  // ---- Memorandum header ----
  lines.push(`# MEMORANDUM`);
  lines.push("");
  lines.push(`**To:** Training and compliance leads`);
  lines.push(`**From:** ${b.clientName}`);
  lines.push(`**Date:** ${now}`);
  lines.push(`**Subject:** ${course.title}`);
  lines.push(`**Audience:** ${course.targetAudience || "General learners"}`);
  lines.push(`**Duration:** ${course.estimatedDuration || "Not specified"}`);
  const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;
  lines.push(
    `**Contents:** ${plural(course.modules.length, "module")} · ${plural(totalCards, "teaching section")} · ${plural(totalQuiz, "check")}`
  );
  lines.push("");
  lines.push("---");
  lines.push("");

  // ---- 1. Course Overview ----
  lines.push(`## 1. Course Overview`);
  lines.push("");
  lines.push(course.description || "No description provided.");
  lines.push("");

  // ---- 2. Learning Objectives ----
  lines.push(`## 2. Learning Objectives`);
  lines.push("");
  if (totalObjectives === 0) {
    lines.push("_Learning objectives will be finalized during course review._");
  } else {
    course.modules.forEach((m, mi) => {
      if (m.learningObjectives && m.learningObjectives.length > 0) {
        lines.push(`**Module ${mi + 1}: ${m.title}**`);
        m.learningObjectives.forEach((obj) => {
          lines.push(`- ${obj}`);
        });
        lines.push("");
      }
    });
  }
  lines.push("");

  // ---- 3. Module Summary ----
  lines.push(`## 3. Module Summary`);
  lines.push("");
  course.modules.forEach((m, mi) => {
    lines.push(`### Module ${mi + 1}: ${m.title}`);
    lines.push("");
    m.content.forEach((card, ci) => {
      const first = card.split(/(?<=[.!?])\s+/)[0] || `Point ${ci + 1}`;
      const heading = first.length > 90 ? first.slice(0, 87).replace(/\s+\S*$/, "") : first.replace(/\.$/, "");
      lines.push(`**${mi + 1}.${ci + 1} ${heading}**`);
      lines.push("");
      lines.push(card);
      lines.push("");
    });
    if (m.scenario) {
      lines.push(`**Case.** ${m.scenario.prompt}`);
      lines.push("");
      m.scenario.options.forEach((opt) => {
        lines.push(`- **${opt.isCorrect ? "Professional response" : "Other response"}:** ${opt.text}`);
        if (opt.feedback) lines.push(`  ${opt.feedback}`);
      });
      lines.push("");
    }
    if (m.quiz.length > 0) {
      lines.push(`**Check**`);
      lines.push("");
      m.quiz.forEach((q, qi) => {
        lines.push(`${qi + 1}. ${q.question}`);
        q.options.forEach((option, oi) => {
          const mark = oi === q.correctIndex ? "**" : "";
          lines.push(`   - ${mark}${String.fromCharCode(65 + oi)}. ${option}${mark}`);
        });
        if (q.rationale) lines.push(`   _${q.rationale}_`);
        lines.push("");
      });
    }
    lines.push("");
  });
  lines.push("");

  // ---- 4. Assessment Strategy ----
  lines.push(`## 4. Assessment Strategy`);
  lines.push("");
  lines.push(`- **Format:** Multiple choice (4 options per question)`);
  lines.push(`- **Total questions:** ${totalQuiz}`);
  lines.push(`- **Passing score:** 70% (${b.clientName} standard)`);
  lines.push(`- **Retake policy:** Learner may retake upon failure`);
  lines.push(`- **Reporting:** Scores and completion status report back to the LMS via SCORM 1.2`);
  lines.push("");

  // ---- 5. Delivery Recommendations ----
  lines.push(`## 5. Delivery Recommendations`);
  lines.push("");
  lines.push(`- **Mode:** Self-paced eLearning (SCORM 1.2 compatible)`);
  lines.push(`- **Estimated completion time:** ${course.estimatedDuration || "as configured"}`);
  lines.push(`- **Compatible LMS platforms:** Moodle, Cornerstone, Docebo, TalentLMS, SAP SuccessFactors`);
  lines.push(`- **Blended option:** Pair with instructor-led discussion on scenario decisions`);
  lines.push(`- **Accessibility:** Compliant with keyboard navigation and ARIA labels`);
  lines.push("");

  // ---- 6. Deployment Notes ----
  lines.push(`## 6. Deployment Notes`);
  lines.push("");
  lines.push(`1. Download the SCORM 1.2 package from the Course Factory interface`);
  lines.push(`2. Upload the .zip to the target LMS as a SCORM package`);
  lines.push(`3. Assign to the intended learner group`);
  lines.push(`4. Monitor completion and assessment results via the LMS reporting dashboard`);
  lines.push("");

  // ---- 7. References ----
  lines.push(`## 7. References`);
  lines.push("");
  lines.push(`- Prepared for ${b.clientName}`);
  if (site) lines.push(`- [${site.replace(/\/$/, "")}](${site})`);
  if (b.footerText) lines.push(`- ${b.footerText}`);
  lines.push("");

  lines.push("---");
  lines.push("");
  lines.push(`_This memorandum was auto-generated by Course Factory and is subject to review and approval by a qualified Subject Matter Expert before deployment._`);

  return brandingHeader + lines.join("\n") + `\n\n---\n\n${buildFooter(b)}\n`;
}

/**
 * Triggers a browser download of the memo as a Markdown file.
 */
export function downloadMemo(course: GeneratedCourse, branding?: Branding): void {
  const memo = generateMemo(course, branding);
  const blob = new Blob([memo], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const safeTitle = `${(branding ?? DEFAULT_BRANDING).clientName}-${course.title}`
    .replace(/[^a-zA-Z0-9]/g, "-")
    .toLowerCase();
  a.download = `${safeTitle}-memo.md`;
  a.click();
  URL.revokeObjectURL(url);
}
