import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import AppSidebar from "@/components/AppSidebar";
import ThemeToggle from "@/components/ThemeToggle";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TaskFlow | Task Management",
  description: "A collaborative task management app for planning, tracking, and completing work.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-screen bg-[var(--background)] text-[var(--foreground)] transition-colors duration-300 ease-in-out">
        <div className="flex min-h-screen flex-col lg:flex-row">
          <AppSidebar />

          <div className="flex min-h-screen flex-1 flex-col">
            <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--background)]/90 backdrop-blur-sm">
              <div className="mx-auto flex w-full max-w-7xl items-center justify-end px-4 py-3 sm:px-6 lg:px-8">
                <ThemeToggle />
              </div>
            </header>

            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-black focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
            >
              Skip to content
            </a>

            <div className="flex-1">{children}</div>
          </div>
        </div>
      </body>
    </html>
  );
}
