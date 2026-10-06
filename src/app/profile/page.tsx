import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Workspace from "@/models/Workspace";
import { updateProfile } from "./actions";

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/login");
  }

  await connectDB();

  const user = await User.findOne({ email: session.user.email }).lean();

  if (!user) {
    redirect("/login");
  }

  const workspace = user.workspaceId
    ? await Workspace.findById(user.workspaceId).lean()
    : null;

  const isWorkspaceOwner = !!workspace && workspace.ownerId?.toString() === user._id.toString();

  return (
    <main id="main-content" className="min-h-screen bg-[var(--background)] p-6 text-[var(--foreground)] md:p-10">
      <div className="mx-auto max-w-4xl space-y-8">
        <header className="flex flex-col gap-3 rounded-2xl bg-[var(--panel)] p-6 shadow-sm ring-1 ring-[var(--border)] md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.14em] text-blue-600">
              Profile
            </p>
            <h1 className="mt-2 text-3xl font-bold text-[var(--foreground)]">Your account</h1>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="rounded-md border border-[var(--border)] bg-[var(--panel)] px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--panel-muted)]"
            >
              Dashboard
            </Link>
            <Link
              href="/workspace"
              className="rounded-md bg-[var(--button-solid)] px-4 py-2 text-sm font-medium text-[var(--background)] hover:bg-[var(--button-solid-hover)]"
            >
              Team workspace
            </Link>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl bg-[var(--panel)] p-6 shadow-sm ring-1 ring-[var(--border)]">
            <h2 className="text-xl font-semibold text-[var(--foreground)]">Edit profile</h2>

            <form action={updateProfile} className="mt-6 space-y-5">
              <div>
                <label htmlFor="name" className="mb-1 block text-sm font-medium text-[var(--text-soft)]">
                  Name
                </label>
                <input
                  id="name"
                  name="name"
                  defaultValue={String(user.name || "")}
                  required
                  className="w-full rounded-md border border-[var(--border)] bg-[var(--panel)] px-3 py-2.5 text-[var(--foreground)] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label htmlFor="avatarUrl" className="mb-1 block text-sm font-medium text-[var(--text-soft)]">
                  Avatar URL
                </label>
                <input
                  id="avatarUrl"
                  name="avatarUrl"
                  defaultValue={String(user.avatarUrl || "")}
                  placeholder="https://example.com/avatar.png"
                  className="w-full rounded-md border border-[var(--border)] bg-[var(--panel)] px-3 py-2.5 text-[var(--foreground)] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <button
                type="submit"
                className="rounded-md bg-[var(--button-solid)] px-5 py-2.5 font-medium text-[var(--background)] hover:bg-[var(--button-solid-hover)]"
              >
                Save profile
              </button>
            </form>
          </div>

          <aside className="rounded-2xl bg-[var(--panel-strong)] p-6 text-[var(--foreground)] shadow-sm ring-1 ring-[var(--border)]">
            <h2 className="text-xl font-semibold">Workspace overview</h2>

            <div className="mt-5 space-y-4">
              <div>
                <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">Workspace</p>
                <p className="mt-1 text-lg font-semibold">{workspace?.name || "Personal workspace"}</p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">Email</p>
                <p className="mt-1 text-base text-[var(--foreground)]">{user.email}</p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">Role</p>
                <p className="mt-1 text-base text-[var(--foreground)]">
                  {isWorkspaceOwner ? "Workspace owner" : workspace ? "Workspace member" : "Personal workspace"}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">Invite code</p>
                <p className="mt-1 rounded-md bg-[var(--panel)] px-3 py-2 font-mono text-sm text-[var(--foreground)] ring-1 ring-[var(--border)]">
                  {workspace?.inviteCode || "Not available"}
                </p>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
