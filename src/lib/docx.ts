import { type Branding, DEFAULT_BRANDING, brandHex, resolvePalette, websiteHref } from "./branding";
import { fitBox, loadLogo } from "./logo";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
  PageBreak,
  ImageRun,
  Footer,
  Header,
  ExternalHyperlink,
} from "docx";
import type { GeneratedCourse } from "./ai";

/**
 * Builds a professional Word document from a generated course.
 * Suitable for trainers, managers, and compliance officers.
 */
export async function buildDocx(course: GeneratedCourse, branding?: Branding): Promise<Blob> {
  const b = branding ?? DEFAULT_BRANDING;
  const palette = resolvePalette(b);
  const brand = brandHex(palette.primary);
  const accent = brandHex(palette.accent);
  const paper = brandHex(palette.paper);
  const logo = await loadLogo(b.logoUrl);
  const site = websiteHref(b.websiteUrl);
  const logoBox = logo ? fitBox(logo.width, logo.height, 280, 240) : null;
  const headerLogoBox = logo ? fitBox(logo.width, logo.height, 200, 130) : null;

  const logoRun = (box: { width: number; height: number }) =>
    new ImageRun({
      type: logo!.type,
      data: logo!.data,
      transformation: box,
      altText: {
        name: b.clientName || "Logo",
        description: `${b.clientName || "Client"} logo`,
      },
    });

  const websiteLink = (size: number) =>
    new ExternalHyperlink({
      link: site,
      children: [
        new TextRun({
          text: site.replace(/\/$/, ""),
          style: "Hyperlink",
          size,
        }),
      ],
    });
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

  // ============ COVER PAGE ============
  const coverLogo = logo && logoBox
    ? new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 200, after: 200 },
        children: [
          logoRun(logoBox),
        ],
      })
    : null;

  // Client name — small heading above the title
  const coverClientName = new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 120 },
    children: [
      new TextRun({
        text: b.clientName,
        bold: true,
        size: 24,
        color: brand,
      }),
    ],
  });

  const coverWebsite = site
    ? new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [websiteLink(22)],
      })
    : null;

  // Course title — large heading below the client name
  const coverRule = new Paragraph({
    border: {
      bottom: { color: accent, space: 1, style: BorderStyle.SINGLE, size: 18 },
    },
    spacing: { before: 80, after: 240 },
  });

  const coverTitle = new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 400 },
    children: [
      new TextRun({
        text: course.title,
        bold: true,
        size: 56,
        color: brand,
      }),
    ],
  });

  const coverSubtitle = new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
    children: [
      new TextRun({
        text: course.description || "",
        size: 24,
        italics: true,
        color: "6B7280",
      }),
    ],
  });

  const coverMeta = new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 600 },
    children: [
      new TextRun({ text: `Generated: ${now}\n`, size: 20, color: "6B7280" }),
      new TextRun({
        text: `Target Audience: ${course.targetAudience || "General"}\n`,
        size: 20,
        color: "6B7280",
      }),
      new TextRun({
        text: `Estimated Duration: ${course.estimatedDuration || "—"}\n`,
        size: 20,
        color: "6B7280",
      }),
      new TextRun({
        text: `Structure: ${course.modules.length} modules · ${totalCards} cards · ${totalQuiz} quiz questions`,
        size: 20,
        color: "6B7280",
      }),
    ],
  });

  // ============ TABLE OF CONTENTS (simple) ============
  const tocHeading = new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200 },
    children: [new TextRun({ text: "Table of Contents", bold: true })],
  });

  const tocItems: Paragraph[] = course.modules.map(
    (m, i) =>
      new Paragraph({
        spacing: { after: 80 },
        children: [
          new TextRun({
            text: `Module ${i + 1}: ${m.title}`,
            size: 24,
          }),
        ],
      })
  );

  const tocPageBreak = new Paragraph({
    children: [new PageBreak()],
  });

  // ============ MODULES ============
  const moduleSections: Paragraph[] = [];
  course.modules.forEach((mod, mi) => {
    // Module header
    moduleSections.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
        children: [
          new TextRun({
            text: `Module ${mi + 1}: ${mod.title}`,
            bold: true,
            size: 32,
            color: brand,
          }),
        ],
      })
    );

    // Learning objectives
    if (mod.learningObjectives && mod.learningObjectives.length > 0) {
      moduleSections.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
          children: [
            new TextRun({
              text: "Learning Objectives",
              bold: true,
              size: 24,
            }),
          ],
        })
      );

      mod.learningObjectives.forEach((obj) => {
        moduleSections.push(
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 80 },
            children: [new TextRun({ text: obj, size: 24 })],
          })
        );
      });
    }

    mod.content.forEach((card, ci) => {
      const first = card.split(/(?<=[.!?])\s+/)[0] || card;
      const heading = first.length > 90 ? `${first.slice(0, 87).replace(/\s+\S*$/, "")}` : first.replace(/\.$/, "");
      moduleSections.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 280, after: 80 },
          children: [
            new TextRun({
              text: `${mi + 1}.${ci + 1}  ${heading}`,
              bold: true,
              size: 26,
              color: brand,
            }),
          ],
        })
      );
      moduleSections.push(
        new Paragraph({
          spacing: { after: 160, line: 276 },
          children: [new TextRun({ text: card, size: 24, font: "Calibri" })],
        })
      );
    });

    if (mod.scenario?.prompt) {
      const caseChildren: Paragraph[] = [
        new Paragraph({
          spacing: { after: 80 },
          children: [
            new TextRun({
              text: "Workplace case",
              bold: true,
              size: 24,
              color: brand,
              font: "Calibri",
            }),
          ],
        }),
        new Paragraph({
          spacing: { after: 140, line: 276 },
          children: [new TextRun({ text: mod.scenario.prompt, size: 24, font: "Calibri" })],
        }),
      ];
      mod.scenario.options.forEach((opt) => {
        caseChildren.push(
          new Paragraph({
            spacing: { before: 80, after: 40 },
            children: [
              new TextRun({
                text: opt.isCorrect ? "Professional response. " : "Other response. ",
                bold: true,
                size: 24,
                color: opt.isCorrect ? "047857" : "4B5563",
                font: "Calibri",
              }),
              new TextRun({ text: opt.text, size: 24, font: "Calibri" }),
            ],
          })
        );
        if (opt.feedback) {
          caseChildren.push(
            new Paragraph({
              spacing: { after: 80 },
              children: [
                new TextRun({
                  text: opt.feedback,
                  italics: true,
                  size: 24,
                  color: "374151",
                  font: "Calibri",
                }),
              ],
            })
          );
        }
      });
      moduleSections.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  shading: { fill: paper },
                  margins: { top: 140, bottom: 140, left: 160, right: 160 },
                  borders: {
                    top: { style: BorderStyle.SINGLE, size: 4, color: accent },
                    bottom: { style: BorderStyle.SINGLE, size: 4, color: accent },
                    left: { style: BorderStyle.SINGLE, size: 24, color: accent },
                    right: { style: BorderStyle.SINGLE, size: 4, color: accent },
                  },
                  children: caseChildren,
                }),
              ],
            }),
          ],
        }) as unknown as Paragraph
      );
      moduleSections.push(new Paragraph({ spacing: { after: 200 }, children: [] }));
    }

    if (mod.quiz.length > 0) {
      moduleSections.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 280, after: 120 },
          children: [
            new TextRun({
              text: "Facilitator answer key",
              bold: true,
              size: 26,
              color: brand,
            }),
          ],
        })
      );

      mod.quiz.forEach((q, qi) => {
        moduleSections.push(
          new Paragraph({
            spacing: { before: 160, after: 60 },
            children: [
              new TextRun({
                text: `Question ${qi + 1}.  ${q.question}`,
                bold: true,
                size: 24,
                font: "Calibri",
              }),
            ],
          })
        );
        q.options.forEach((option, oi) => {
          const correct = oi === q.correctIndex;
          moduleSections.push(
            new Paragraph({
              spacing: { after: 40 },
              indent: { left: 360 },
              children: [
                new TextRun({
                  text: `${String.fromCharCode(65 + oi)}.  ${option}`,
                  size: 24,
                  bold: correct,
                  color: correct ? "047857" : "1F2937",
                  font: "Calibri",
                }),
              ],
            })
          );
        });
        if (q.rationale) {
          moduleSections.push(
            new Paragraph({
              spacing: { before: 40, after: 80 },
              indent: { left: 360 },
              children: [
                new TextRun({
                  text: "Why this is the professional answer. ",
                  bold: true,
                  italics: true,
                  size: 24,
                  font: "Calibri",
                }),
                new TextRun({
                  text: q.rationale,
                  italics: true,
                  size: 24,
                  font: "Calibri",
                }),
              ],
            })
          );
        }
      });
    }
  });

  // ============ ASSESSMENT STRATEGY ============
  const assessmentSection: Paragraph[] = [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 },
      children: [
        new TextRun({
          text: "Assessment Strategy",
          bold: true,
          size: 32,
          color: brand,
        }),
      ],
    }),
    new Paragraph({
      bullet: { level: 0 },
      children: [
        new TextRun({ text: "Format: Multiple choice, 4 options per question", size: 24 }),
      ],
    }),
    new Paragraph({
      bullet: { level: 0 },
      children: [new TextRun({ text: `Total Questions: ${totalQuiz}`, size: 24 })],
    }),
    new Paragraph({
      bullet: { level: 0 },
      children: [
        new TextRun({
          text: `Passing Score: 70% (${b.clientName || "client"} standard)`,
          size: 24,
        }),
      ],
    }),
    new Paragraph({
      bullet: { level: 0 },
      children: [
        new TextRun({ text: "Retake Policy: Learner may retake upon failure", size: 24 }),
      ],
    }),
    new Paragraph({
      bullet: { level: 0 },
      children: [
        new TextRun({
          text: "Reporting: Scores and completion status report back to the LMS via SCORM 1.2",
          size: 24,
        }),
      ],
    }),
  ];

  // ============ DELIVERY RECOMMENDATIONS ============
  const deliverySection: Paragraph[] = [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 },
      children: [
        new TextRun({
          text: "Delivery Recommendations",
          bold: true,
          size: 32,
          color: brand,
        }),
      ],
    }),
    new Paragraph({
      bullet: { level: 0 },
      children: [
        new TextRun({
          text: "Mode: Self-paced eLearning (SCORM 1.2 compatible)",
          size: 24,
        }),
      ],
    }),
    new Paragraph({
      bullet: { level: 0 },
      children: [
        new TextRun({
          text: `Estimated completion time: ${course.estimatedDuration || "as configured"}`,
          size: 24,
        }),
      ],
    }),
    new Paragraph({
      bullet: { level: 0 },
      children: [
        new TextRun({
          text: "Compatible LMS platforms: Moodle, Cornerstone, Docebo, TalentLMS, SAP SuccessFactors",
          size: 24,
        }),
      ],
    }),
    new Paragraph({
      bullet: { level: 0 },
      children: [
        new TextRun({
          text: "Blended option: Pair with instructor-led discussion on scenario decisions",
          size: 24,
        }),
      ],
    }),
    new Paragraph({
      bullet: { level: 0 },
      children: [
        new TextRun({
          text: "Accessibility: Compliant with keyboard navigation and ARIA labels",
          size: 24,
        }),
      ],
    }),
  ];

  // ============ REFERENCES ============
  const referencesSection: Paragraph[] = [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 },
      children: [
        new TextRun({
          text: "References",
          bold: true,
          size: 32,
          color: brand,
        }),
      ],
    }),
    new Paragraph({
      bullet: { level: 0 },
      children: [
        new TextRun({
          text: `Prepared for ${b.clientName || "the client"}`,
          size: 24,
        }),
      ],
    }),
    ...(site
      ? [
          new Paragraph({
            bullet: { level: 0 },
            children: [websiteLink(22)],
          }),
        ]
      : []),
    new Paragraph({
      bullet: { level: 0 },
      children: [
        new TextRun({
          text: b.footerText || "Internal training material",
          size: 24,
        }),
      ],
    }),
  ];

  // ============ FOOTER DISCLAIMER ============
  const disclaimer = new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 400 },
    children: [
      new TextRun({
        text: "This document was auto-generated by Course Factory and is subject to review and approval by a qualified Subject Matter Expert before deployment.",
        size: 18,
        italics: true,
        color: "6B7280",
      }),
    ],
  });

  // ============ BUILD DOCUMENT ============
  const doc = new Document({
    creator: b.clientName || "Course Factory",
    title: course.title,
    description: course.description || "",
    styles: {
      paragraphStyles: [
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          run: { color: brand, bold: true, font: "Calibri" },
        },
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          run: { color: accent, bold: true, font: "Calibri" },
        },
      ],
    },
    sections: [
      {
        headers: {
          first: new Header({
            children: [new Paragraph({})],
          }),
          default: new Header({
            children: [
              new Paragraph({
                spacing: { after: 40 },
                children: [
                  ...(headerLogoBox ? [logoRun(headerLogoBox)] : []),
                  ...(headerLogoBox && site
                    ? [new TextRun({ text: "    ", size: 20 })]
                    : []),
                  ...(site ? [websiteLink(20)] : []),
                ],
              }),
            ],
          }),
        },
        properties: {
          titlePage: true,
          page: {
            margin: { top: 2400, header: 200, bottom: 900, footer: 280 },
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: b.clientName || "",
                    size: 16,
                    color: "6B7280",
                  }),
                  ...(site
                    ? [
                        new TextRun({ text: "  ·  ", size: 16, color: "6B7280" }),
                        websiteLink(16),
                      ]
                    : []),
                  ...(b.footerText
                    ? [
                        new TextRun({
                          text: `  ·  ${b.footerText}`,
                          size: 16,
                          color: "6B7280",
                        }),
                      ]
                    : []),
                ],
              }),
            ],
          }),
        },
        children: [
          ...(coverLogo ? [coverLogo] : []),
          coverClientName,
          ...(coverWebsite ? [coverWebsite] : []),
          coverRule,
          coverTitle,
          coverSubtitle,
          coverMeta,
          new Paragraph({
            children: [new PageBreak()],
          }),
          tocHeading,
          ...tocItems,
          tocPageBreak,
          ...moduleSections,
          ...assessmentSection,
          ...deliverySection,
          ...referencesSection,
          disclaimer,
        ],
      },
    ],
  });

  return await Packer.toBlob(doc);
}

export async function downloadDocx(course: GeneratedCourse, branding?: Branding): Promise<void> {
  const b = branding ?? DEFAULT_BRANDING;
  const blob = await buildDocx(course, branding);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const safeTitle = `${b.clientName}-${course.title}`.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
  a.download = `${safeTitle}-handbook.docx`;
  a.click();
  URL.revokeObjectURL(url);
}
