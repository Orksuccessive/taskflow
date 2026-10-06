import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";

import LogoutButton from "@/components/LogoutButton";
import DashboardStats from "./DashboardStats";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-[var(--background)] p-6 text-[var(--foreground)] md:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-4 rounded-2xl bg-[var(--panel)] p-6 shadow-sm ring-1 ring-[var(--border)] sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.14em] text-blue-600">Overview</p>
            <h1 className="mt-2 text-3xl font-bold text-[var(--foreground)]">Dashboard</h1>
            <p className="mt-1 text-[var(--text-soft)]">Welcome back, {session.user.name}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/workspace"
              className="rounded-md border border-[var(--border)] bg-[var(--panel)] px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--panel-muted)]"
            >
              Workspace
            </Link>
            <Link
              href="/profile"
              className="rounded-md border border-[var(--border)] bg-[var(--panel)] px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--panel-muted)]"
            >
              Profile
            </Link>
            <LogoutButton />
          </div>
        </header>

        <Suspense fallback={<DashboardStatsLoading />}>
          <DashboardStats />
        </Suspense>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/tasks"
            className="inline-flex rounded-md bg-[var(--button-solid)] px-5 py-3 font-medium text-[var(--background)] hover:bg-[var(--button-solid-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--border)] focus:ring-offset-2"
          >
            Open Tasks
          </Link>
          <Link
            href="/workspace"
            className="inline-flex rounded-md border border-[var(--border)] bg-[var(--panel)] px-5 py-3 font-medium text-[var(--foreground)] hover:bg-[var(--panel-muted)]"
          >
            Manage team
          </Link>
        </div>
      </div>
    </main>
  );
}

function DashboardStatsLoading() {
  return (
    <div
      className="mt-8"
      aria-busy="true"
      aria-label="Loading dashboard statistics"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <div
            key={item}
            className="h-32 animate-pulse rounded-lg bg-[var(--panel)] shadow"
          />
        ))}
      </div>

      <div className="mt-8 h-64 animate-pulse rounded-lg bg-[var(--panel)] shadow" />
    </div>
  );
}