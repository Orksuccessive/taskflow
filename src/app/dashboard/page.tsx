import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold">
        Welcome to TaskFlow
      </h1>

      <p className="mt-2">
        Logged in as: {session.user.email}
      </p>

      <p className="mt-2">
        Name: {session.user.name}
      </p>
    </main>
  );
}