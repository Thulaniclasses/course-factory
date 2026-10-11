import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Course Factory — AI eLearning Engine",
  description:
    "Generate modern, interactive eLearning courses from any source material using AI. Produces JSON and SCORM packages.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
