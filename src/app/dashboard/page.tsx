import { auth } from "@/auth";
import { redirect } from "next/navigation";

import LogoutButton from "@/components/LogoutButton";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <main className="p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            Welcome to TaskFlow
          </h1>

          <p className="mt-2">
            Logged in as: {session.user.email}
          </p>

          <p className="mt-2">
            Name: {session.user.name}
          </p>
        </div>

        <LogoutButton />
      </div>
    </main>
  );
}