import type { Metadata } from "next";
import { Bricolage_Grotesque, Newsreader } from "next/font/google";
import "./globals.css";

const ui = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-ui-loaded",
  display: "swap",
});

const paper = Newsreader({
  subsets: ["latin"],
  variable: "--font-paper-loaded",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Resume Customizer",
  description:
    "Paste a job description, upload your resume, and get a version tailored to the role.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${ui.variable} ${paper.variable}`}>
      <body>{children}</body>
    </html>
  );
}
