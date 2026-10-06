import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main id="main-content" className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4 py-12 text-[var(--foreground)]">
      <div className="w-full max-w-5xl rounded-2xl bg-[var(--panel)] p-8 shadow-xl ring-1 ring-[var(--border)] md:p-12">
        <nav aria-label="Main navigation" className="flex items-center justify-between gap-4">
          <div>
            <p className="text-lg font-bold tracking-tight text-[var(--foreground)]">TaskFlow</p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-md border border-[var(--border)] bg-[var(--panel)] px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--panel-muted)] focus-visible:outline-none"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-md bg-[var(--button-solid)] px-4 py-2 text-sm font-medium text-[var(--background)] hover:bg-[var(--button-solid-hover)] focus-visible:outline-none"
            >
              Create account
            </Link>
          </div>
        </nav>

        <section className="mt-14 grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-blue-600">
              Project planning made simple
            </p>

            <h1 className="mt-4 text-4xl font-black tracking-tight text-[var(--foreground)] md:text-5xl">
              Turn work into momentum.
            </h1>

            <p className="mt-5 max-w-xl text-lg text-[var(--text-soft)]">
              TaskFlow helps you capture priorities, track progress across stages, and keep the whole team aligned without losing context.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center rounded-md bg-[var(--button-solid)] px-6 py-3 text-base font-medium text-[var(--background)] hover:bg-[var(--button-solid-hover)] focus-visible:outline-none"
              >
                Start free
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-md border border-[var(--border)] bg-[var(--panel)] px-6 py-3 text-base font-medium text-[var(--foreground)] hover:bg-[var(--panel-muted)] focus-visible:outline-none"
              >
                Already have an account?
              </Link>
            </div>
          </div>

          <div className="rounded-xl bg-[var(--panel-strong)] p-6 text-[var(--foreground)] shadow-lg ring-1 ring-[var(--border)]">
            <h2 className="text-xl font-semibold">Why teams use TaskFlow</h2>

            <ul className="mt-5 space-y-4 text-sm text-[var(--text-soft)]">
              <li className="flex gap-3"><span aria-hidden="true">✓</span><span>Organize tasks by status, priority, due date, and assignee.</span></li>
              <li className="flex gap-3"><span aria-hidden="true">✓</span><span>Track work with transparent task history and comments.</span></li>
              <li className="flex gap-3"><span aria-hidden="true">✓</span><span>Focus on execution with a clean dashboard and filterable board.</span></li>
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}
