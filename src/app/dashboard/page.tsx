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
    <main className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              Dashboard
            </h1>

            <p className="mt-1 text-gray-600">
              Welcome back, {session.user.name}
            </p>
          </div>

          <LogoutButton />
        </header>

        <Suspense fallback={<DashboardStatsLoading />}>
          <DashboardStats />
        </Suspense>

        <div className="mt-8">
         <Link
  href="/tasks"
  className="inline-flex rounded-md bg-black px-5 py-3 font-medium text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2"
>
  Open Tasks
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
            className="h-32 animate-pulse rounded-lg bg-white shadow"
          />
        ))}
      </div>

      <div className="mt-8 h-64 animate-pulse rounded-lg bg-white shadow" />
    </div>
  );
}