"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (!result || result.error) {
        setError("Invalid email or password");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main id="main-content" className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4 py-8 text-[var(--foreground)]">
      <div className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--panel)] p-8 shadow-lg">
        <h1 className="mb-2 text-2xl font-bold text-[var(--foreground)]">Welcome back</h1>

        <p className="mb-6 text-sm text-[var(--text-soft)]">
          Log in to your TaskFlow account.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate aria-describedby="login-status">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-[var(--text-soft)]">
              Email
            </label>

            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "login-status" : undefined}
              className="w-full rounded-md border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-[var(--foreground)] placeholder:text-[var(--text-muted)] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-[var(--text-soft)]">
              Password
            </label>

            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoComplete="current-password"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "login-status" : undefined}
              className="w-full rounded-md border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-[var(--foreground)] placeholder:text-[var(--text-muted)] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              placeholder="Your password"
            />
          </div>

          <div id="login-status" aria-live="polite" aria-atomic="true">
            {error && (
              <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-[var(--button-solid)] px-4 py-2.5 font-medium text-[var(--background)] disabled:cursor-not-allowed disabled:opacity-60 hover:bg-[var(--button-solid-hover)] focus-visible:outline-none"
          >
            {loading ? "Logging in..." : "Log in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--text-soft)]">
          Don’t have an account?{" "}
          <Link href="/signup" className="font-medium text-[var(--foreground)] underline underline-offset-2">
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}
