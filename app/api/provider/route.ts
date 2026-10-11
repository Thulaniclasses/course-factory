import { NextResponse } from "next/server";
import { checkProvider } from "@/lib/ai";

export const runtime = "nodejs";

export async function GET() {
  try {
    const status = await checkProvider();
    return NextResponse.json(status);
  } catch (error) {
    return NextResponse.json(
      {
        mode: "unknown",
        available: false,
        message:
          error instanceof Error ? error.message : "Unknown provider error",
      },
      { status: 200 }
    );
  }
}
