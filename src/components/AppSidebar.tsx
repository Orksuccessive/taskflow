"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/tasks", label: "Tasks" },
  { href: "/workspace", label: "Workspace" },
  { href: "/profile", label: "Profile" },
];

export default function AppSidebar() {
  const pathname = usePathname();

  if (["/", "/login", "/signup"].includes(pathname)) {
    return null;
  }

  return (
    <>
      <aside className="hidden w-64 shrink-0 border-r border-[var(--border)] bg-[var(--panel)] p-4 lg:flex lg:flex-col">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">TaskFlow</p>
          <h1 className="mt-2 text-2xl font-bold text-[var(--foreground)]">Workspace</h1>
        </div>

        <nav aria-label="Main navigation" className="space-y-2">
          {navItems.map(({ href, label }) => {
            const isActive = pathname === href || pathname.startsWith(`${href}/`);

            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-[var(--panel-muted)] text-[var(--foreground)] ring-1 ring-[var(--border)]"
                    : "text-[var(--text-soft)] hover:bg-[var(--panel-muted)] hover:text-[var(--foreground)]"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="border-b border-[var(--border)] bg-[var(--panel)] lg:hidden">
        <nav aria-label="Mobile navigation" className="flex gap-2 overflow-x-auto p-3">
          {navItems.map(({ href, label }) => {
            const isActive = pathname === href || pathname.startsWith(`${href}/`);

            return (
              <Link
                key={href}
                href={href}
                className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium ${
                  isActive
                    ? "bg-[var(--panel-muted)] text-[var(--foreground)] ring-1 ring-[var(--border)]"
                    : "text-[var(--text-soft)]"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
