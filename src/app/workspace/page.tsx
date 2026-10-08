import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import { ConfirmActionForm } from "@/components/ConfirmActionForm";
import User from "@/models/User";
import Workspace from "@/models/Workspace";
import {
  approveWorkspaceJoin,
  createWorkspace,
  deleteWorkspace,
  joinWorkspace,
  leaveWorkspace,
  rejectWorkspaceJoin,
  removeMember,
  switchWorkspace,
} from "./actions";

export default async function WorkspacePage({
  searchParams,
}: {
  searchParams: Promise<{ joinStatus?: string; workspaceName?: string }>;
}) {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/login");
  }

  await connectDB();

  const user = await User.findOne({ email: session.user.email }).lean();

  if (!user) {
    redirect("/login");
  }

  const savedWorkspaceIds = Array.isArray(user.workspaceIds) && user.workspaceIds.length > 0
    ? user.workspaceIds.map((id) => id.toString())
    : [];

  const memberWorkspaceIds = await Workspace.find({ members: user._id })
    .select("_id")
    .lean()
    .then((entries) => entries.map((entry) => entry._id.toString()));

  const allWorkspaceIds = Array.from(new Set([...(savedWorkspaceIds || []), ...(memberWorkspaceIds || [])]));

  const workspaces = allWorkspaceIds.length
    ? await Workspace.find({ _id: { $in: allWorkspaceIds } })
        .populate("members", "name email avatarUrl")
        .populate("pendingMembers", "name email avatarUrl")
        .sort({ createdAt: -1 })
        .lean()
    : [];

  const params = await searchParams;
  const joinStatus = params.joinStatus;
  const pendingWorkspaceName = params.workspaceName ? decodeURIComponent(params.workspaceName) : "workspace";

  const activeWorkspaceId = user.workspaceId;
  const workspace = activeWorkspaceId
    ? workspaces.find((entry) => entry._id.toString() === activeWorkspaceId.toString()) || null
    : workspaces[0] || null;

  const isOwner = !!workspace && workspace.ownerId?.toString() === user._id.toString();
  const isPendingMember = !!workspace && Array.isArray(workspace.pendingMembers)
    ? workspace.pendingMembers.some((member) => member && typeof member === "object" && "_id" in member && member._id?.toString() === user._id.toString())
    : false;

  return (
    <main id="main-content" className="min-h-screen bg-[var(--background)] p-6 text-[var(--foreground)] md:p-10">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="flex flex-col gap-3 rounded-2xl bg-[var(--panel)] p-6 shadow-sm ring-1 ring-[var(--border)] md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.14em] text-blue-600">
              Workspace
            </p>
            <h1 className="mt-2 text-3xl font-bold text-[var(--foreground)]">Team management</h1>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="rounded-md border border-[var(--border)] bg-[var(--panel)] px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--panel-muted)]"
            >
              Dashboard
            </Link>
            <Link
              href="/profile"
              className="rounded-md bg-[var(--button-solid)] px-4 py-2 text-sm font-medium text-[var(--background)] hover:bg-[var(--button-solid-hover)]"
            >
              Profile
            </Link>
          </div>
        </header>

        {joinStatus === "pending" && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 shadow-sm">
            Your request to join <span className="font-semibold">{pendingWorkspaceName}</span> has been sent and is waiting for workspace owner approval.
          </div>
        )}

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl bg-[var(--panel)] p-6 shadow-sm ring-1 ring-[var(--border)]">
            <h2 className="text-xl font-semibold text-[var(--foreground)]">Create a workspace</h2>

            <form action={createWorkspace} className="mt-5 space-y-4">
              <div>
                <label htmlFor="workspaceName" className="mb-1 block text-sm font-medium text-[var(--text-soft)]">
                  Workspace name
                </label>
                <input
                  id="workspaceName"
                  name="workspaceName"
                  placeholder="Marketing team"
                  required
                  className="w-full rounded-md border border-[var(--border)] bg-[var(--panel)] px-3 py-2.5 text-[var(--foreground)] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <button
                type="submit"
                className="rounded-md bg-[var(--button-solid)] px-5 py-2.5 font-medium text-[var(--background)] hover:bg-[var(--button-solid-hover)]"
              >
                Create workspace
              </button>
            </form>
          </div>

          <div className="rounded-2xl bg-[var(--panel)] p-6 shadow-sm ring-1 ring-[var(--border)]">
            <h2 className="text-xl font-semibold text-[var(--foreground)]">Join a workspace</h2>

            {isPendingMember ? (
              <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                Your request is pending approval from the workspace owner.
              </div>
            ) : (
              <form action={joinWorkspace} className="mt-5 space-y-4">
                <div>
                  <label htmlFor="inviteCode" className="mb-1 block text-sm font-medium text-[var(--text-soft)]">
                    Invite code
                  </label>
                  <input
                    id="inviteCode"
                    name="inviteCode"
                    placeholder="ABCDE123"
                    required
                    className="w-full rounded-md border border-[var(--border)] bg-[var(--panel)] px-3 py-2.5 text-[var(--foreground)] uppercase focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <button
                  type="submit"
                  className="rounded-md border border-[var(--border)] bg-[var(--panel)] px-5 py-2.5 font-medium text-[var(--foreground)] hover:bg-[var(--panel-muted)]"
                >
                  Join workspace
                </button>
              </form>
            )}
          </div>
        </section>

        {workspaces.length > 0 && (
          <section className="rounded-2xl bg-[var(--panel)] p-6 shadow-sm ring-1 ring-[var(--border)]">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-[var(--foreground)]">Your workspaces</h2>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {workspaces.map((entry) => {
                const entryId = String(entry._id);
                const isActive = user.workspaceId && entryId === user.workspaceId.toString();

                return (
                  <div key={entryId} className={`rounded-xl border p-4 ${isActive ? "border-blue-200 bg-blue-50 dark:bg-blue-950/30" : "border-[var(--border)] bg-[var(--panel-muted)]"}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold text-[var(--foreground)]">{entry.name}</p>
                        <p className="mt-1 text-sm text-[var(--text-muted)]">Invite code: {entry.inviteCode}</p>
                      </div>

                      {isActive && (
                        <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700">active</span>
                      )}
                    </div>

                    <form action={switchWorkspace} className="mt-4">
                      <input type="hidden" name="workspaceId" value={entryId} />
                      <button
                        type="submit"
                        className="w-full rounded-md border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--panel-muted)]"
                      >
                        {isActive ? "Current workspace" : "Open workspace"}
                      </button>
                    </form>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section className="rounded-2xl bg-[var(--panel)] p-6 shadow-sm ring-1 ring-[var(--border)]">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-[var(--foreground)]">Current workspace</h2>
            {workspace && (
              <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
                {workspace.inviteCode}
              </span>
            )}
          </div>

          {workspace ? (
            <div className="mt-6 space-y-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.12em] text-[var(--text-muted)]">Name</p>
                  <p className="mt-1 text-2xl font-bold text-[var(--foreground)]">{workspace.name}</p>
                </div>

                <div className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
                  {isOwner ? "Owner" : "Member"}
                </div>
              </div>

              {isOwner && Array.isArray(workspace.pendingMembers) && workspace.pendingMembers.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-medium uppercase tracking-[0.12em] text-amber-800">Pending join requests</p>

                  <div className="mt-3 space-y-3">
                    {((workspace.pendingMembers as Array<{ _id: unknown; name?: string; email?: string; avatarUrl?: string }> | undefined) || []).map((requester) => {
                      const requesterId = String(requester._id);

                      return (
                        <div key={requesterId} className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-[var(--border)] text-sm font-semibold text-[var(--foreground)]">
                              {requester.avatarUrl ? (
                                <img src={requester.avatarUrl} alt={requester.name || "Requesting member avatar"} className="h-full w-full object-cover" />
                              ) : (
                                (requester.name || requester.email || "U").charAt(0).toUpperCase()
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-[var(--foreground)]">{requester.name || "Unnamed member"}</p>
                              <p className="text-sm text-[var(--text-muted)]">{requester.email}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <form action={approveWorkspaceJoin}>
                              <input type="hidden" name="workspaceId" value={String(workspace._id)} />
                              <input type="hidden" name="memberId" value={requesterId} />
                              <button
                                type="submit"
                                className="rounded-md bg-green-600 px-3 py-2 text-xs font-medium text-white hover:bg-green-700"
                              >
                                Approve
                              </button>
                            </form>

                            <form action={rejectWorkspaceJoin}>
                              <input type="hidden" name="workspaceId" value={String(workspace._id)} />
                              <input type="hidden" name="memberId" value={requesterId} />
                              <button
                                type="submit"
                                className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-100"
                              >
                                Reject
                              </button>
                            </form>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <p className="text-sm font-medium uppercase tracking-[0.12em] text-[var(--text-muted)]">Members</p>

                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {((workspace.members as Array<{ _id: unknown; name?: string; email?: string; avatarUrl?: string }> | undefined) || []).map((member) => {
                    const memberId = String(member._id);
                    const isMemberOwner = workspace.ownerId?.toString() === memberId;

                    return (
                      <div key={memberId} className="rounded-lg border border-[var(--border)] bg-[var(--panel-muted)] p-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-[var(--border)] text-sm font-semibold text-[var(--foreground)]">
                            {member.avatarUrl ? (
                              <img src={member.avatarUrl} alt={member.name || "Member avatar"} className="h-full w-full object-cover" />
                            ) : (
                              (member.name || member.email || "U").charAt(0).toUpperCase()
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-[var(--foreground)]">{member.name || "Unnamed member"}</p>
                            <p className="truncate text-sm text-[var(--text-muted)]">{member.email}</p>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-2">
                          <span className="rounded-full bg-[var(--border)] px-2 py-1 text-xs font-medium text-[var(--foreground)]">
                            {isMemberOwner ? "Owner" : "Member"}
                          </span>

                          {isOwner && !isMemberOwner && (
                            <ConfirmActionForm
                              action={removeMember}
                              confirmMessage={`Remove ${member.name || "this member"} from the workspace?`}
                            >
                              <input type="hidden" name="memberId" value={memberId} />
                              <button
                                type="submit"
                                className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
                              >
                                Remove
                              </button>
                            </ConfirmActionForm>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {isOwner ? (
                <ConfirmActionForm
                  action={deleteWorkspace}
                  className="pt-2"
                  confirmMessage={`Delete the workspace "${workspace.name}" and all its tasks? This cannot be undone.`}
                >
                  <input type="hidden" name="workspaceId" value={String(workspace._id)} />
                  <button
                    type="submit"
                    className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
                  >
                    Delete workspace
                  </button>
                </ConfirmActionForm>
              ) : (
                <ConfirmActionForm
                  action={leaveWorkspace}
                  className="pt-2"
                  confirmMessage={`Leave the workspace "${workspace.name}"? You will lose access until you are re-invited.`}
                >
                  <button
                    type="submit"
                    className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
                  >
                    Leave workspace
                  </button>
                </ConfirmActionForm>
              )}
            </div>
          ) : (
            <p className="mt-4 text-[var(--text-soft)]">
              You are not in a workspace yet. Create one or join with an invite code to start managing team work.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
