import { NextResponse } from "next/server";
import { generateCourse } from "@/lib/ai";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const sourceText = body?.sourceText;

    if (!sourceText || typeof sourceText !== "string" || sourceText.trim().length < 50) {
      return NextResponse.json(
        { error: "Source material must be at least 50 characters." },
        { status: 400 }
      );
    }

    const course = await generateCourse(sourceText);
    return NextResponse.json({ course });
  } catch (error) {
    console.error("Generate error:", error);
    const message =
      error instanceof Error ? error.message : "Unknown error generating course";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
