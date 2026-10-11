import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
} from "docx";
import type { GeneratedCourse } from "./ai";
import { buildMemorandum } from "./memorandum";

export async function buildMemorandumDocx(
  course: GeneratedCourse
): Promise<Blob> {
  const sections = buildMemorandum(course);

  const children: Paragraph[] = [];

  // ---- Title page ----
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 2000, after: 200 },
      children: [
        new TextRun({
          text: "TRAINING MEMORANDUM",
          bold: true,
          size: 32,
          color: "1E293B",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [
        new TextRun({
          text: course.title,
          bold: true,
          size: 28,
          color: "0F172A",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: course.description || "",
          italics: true,
          size: 22,
          color: "475569",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 800 },
      children: [
        new TextRun({
          text: `Generated: ${new Date(course.generatedAt || Date.now()).toLocaleDateString()}`,
          size: 20,
          color: "94A3B8",
        }),
      ],
    }),
    new Paragraph({ text: "", pageBreakBefore: true })
  );

  // ---- Sections ----
  sections.forEach((section) => {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 300, after: 200 },
        children: [
          new TextRun({
            text: section.heading,
            bold: true,
            size: 26,
            color: "0F172A",
          }),
        ],
      })
    );

    section.body.forEach((line) => {
      children.push(
        new Paragraph({
          spacing: { after: 120 },
          children: [
            new TextRun({
              text: line,
              size: 22,
              color: "334155",
            }),
          ],
        })
      );
    });
  });

  const doc = new Document({
    creator: "Course Factory AI",
    title: course.title,
    description: course.description,
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  return await Packer.toBlob(doc);
}

export function downloadDocx(blob: Blob, courseTitle: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${courseTitle.replace(/\s+/g, "-").toLowerCase()}-memorandum.docx`;
  a.click();
  URL.revokeObjectURL(url);
}
