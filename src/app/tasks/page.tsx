import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/mongodb";
import Task from "@/models/Task";
import mongoose from "mongoose";
import { createTask } from "./actions";
import Comment from "@/models/Comment";
import Workspace from "@/models/Workspace";
import TaskBoard from "@/components/TaskBoard";
import { switchWorkspace } from "@/app/workspace/actions";

function createInviteCode() {
  return Array.from({ length: 8 }, () =>
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[
      Math.floor(Math.random() * 32)
    ]
  ).join("");
}

function serializeId(value: unknown) {
  if (!value) {
    return value;
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof (value as { toString?: () => string }).toString === "function") {
    return (value as { toString: () => string }).toString();
  }

  return value;
}

type SerializedTask = {
  _id: string;
  title: string;
  description?: string;
  status: "todo" | "in-progress" | "done";
  priority: "low" | "medium" | "high";
  userId?: string | null;
  workspaceId?: string | null;
  assignee?: { _id?: string; name?: string; email?: string } | null;
  dueDate?: string | null;
  tags?: string[];
  createdAt?: string | null;
  updatedAt?: string | null;
};

type SerializedUser = {
  _id: string;
  name: string;
  email: string;
};

function serializeTask(task: any): SerializedTask {
  return {
    ...task,
    _id: serializeId(task._id),
    userId: serializeId(task.userId),
    workspaceId: serializeId(task.workspaceId),
    assignee: task.assignee
      ? {
          ...(typeof task.assignee === "object" ? task.assignee : {}),
          _id: serializeId(task.assignee?._id),
          name: task.assignee?.name ?? undefined,
          email: task.assignee?.email ?? undefined,
        }
      : null,
    dueDate: task.dueDate ? new Date(task.dueDate).toISOString() : null,
    createdAt: task.createdAt ? new Date(task.createdAt).toISOString() : null,
    updatedAt: task.updatedAt ? new Date(task.updatedAt).toISOString() : null,
  } as SerializedTask;
}

function serializeUser(user: any): SerializedUser {
  return {
    ...user,
    _id: serializeId(user._id),
  } as SerializedUser;
}

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    status?: string;
    assignee?: string;
    tag?: string;
    sort?: string;
  }>;
}) {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/login");
  }

  await connectDB();

  const User = mongoose.model("User");

  const user = await User.findOne({
    email: session.user.email,
  });

  if (!user) {
    redirect("/login");
  }

  if (!user.workspaceId) {
    const workspace = await Workspace.create({
      name: user.name ? `${user.name}'s workspace` : "My workspace",
      inviteCode: createInviteCode(),
      ownerId: user._id,
      members: [user._id],
    });

    user.workspaceId = workspace._id;
    await user.save();
  }

  const params = await searchParams;

  const search = params.search?.trim() || "";
  const status = params.status || "";
  const tag = params.tag?.trim() || "";
  const sort = params.sort || "newest";

  const allWorkspaceIds = Array.isArray(user.workspaceIds) && user.workspaceIds.length > 0
    ? user.workspaceIds
    : user.workspaceId
      ? [user.workspaceId]
      : [];

  const workspaces = allWorkspaceIds.length
    ? await Workspace.find({ _id: { $in: allWorkspaceIds } }).select("_id name ownerId inviteCode").sort({ createdAt: -1 }).lean()
    : [];

  const workspace = await Workspace.findById(user.workspaceId).lean();
  const isOwner = !!workspace && workspace.ownerId?.toString() === user._id.toString();
  const assigneeParam = params.assignee || (isOwner ? "all" : "mine");
  const assignee = assigneeParam === "mine" ? user._id.toString() : assigneeParam;

  const query: Record<string, unknown> = { workspaceId: user.workspaceId };

  if (!isOwner) {
    if (assigneeParam === "mine" || !assigneeParam || assigneeParam === "") {
      query.assignee = user._id;
    } else if (assignee && mongoose.isValidObjectId(assignee)) {
      query.assignee = assignee;
    }
  }

  if (search) {
    query.title = {
      $regex: search,
      $options: "i",
    };
  }

  if (
    status &&
    ["todo", "in-progress", "done"].includes(status)
  ) {
    query.status = status;
  }

  if (isOwner && assignee && mongoose.isValidObjectId(assignee)) {
    query.assignee = assignee;
  }

  if (tag) {
    query.tags = tag;
  }

  let sortOption: Record<string, 1 | -1>;

  switch (sort) {
    case "oldest":
      sortOption = { createdAt: 1 };
      break;

    case "title-asc":
      sortOption = { title: 1 };
      break;

    case "title-desc":
      sortOption = { title: -1 };
      break;

    case "newest":
    default:
      sortOption = { createdAt: -1 };
      break;
  }

  const tasks = await Task.find(query)
    .populate("assignee", "_id name email")
    .sort(sortOption)
    .lean();

  const comments = await Comment.find({
    taskId: {
      $in: tasks.map((task) => task._id),
    },
  })
    .populate("authorId", "name email")
    .sort({ createdAt: -1 })
    .lean();

  const commentsByTask = new Map<
  string,
  typeof comments
>();

for (const comment of comments) {
  const taskId = comment.taskId.toString();

  const existing = commentsByTask.get(taskId) || [];

  existing.push(comment);

  commentsByTask.set(taskId, existing);
}

  const workspaceMembers = user.workspaceId
    ? await Workspace.findById(user.workspaceId).select("members").lean()
    : null;

  const memberIds = workspaceMembers?.members && Array.isArray(workspaceMembers.members)
    ? workspaceMembers.members.map((memberId) => new mongoose.Types.ObjectId(String(memberId)))
    : [user._id];

  const users = await User.find({
    _id: { $in: memberIds },
  })
    .select("_id name email")
    .sort({ name: 1 })
    .lean() as unknown as Array<{
    _id: mongoose.Types.ObjectId;
    name: string;
    email: string;
  }>;

  const serializedTasks: SerializedTask[] = tasks.map((task) => serializeTask(task));
  const serializedUsers: SerializedUser[] = users.map((user) => serializeUser(user));
  const serializedCommentsByTask = Object.fromEntries(
    Array.from(commentsByTask.entries()).map(([taskId, taskComments]) => [
      taskId,
      taskComments.map((comment) => ({
        _id: comment._id.toString(),
        content: comment.content,
        createdAt: comment.createdAt ? new Date(comment.createdAt).toISOString() : new Date().toISOString(),
        authorId: comment.authorId
          ? {
              _id: typeof comment.authorId === "object" && "_id" in comment.authorId ? String(comment.authorId._id ?? "") : undefined,
              name: typeof comment.authorId === "object" && "name" in comment.authorId ? String(comment.authorId.name ?? "") : undefined,
              email: typeof comment.authorId === "object" && "email" in comment.authorId ? String(comment.authorId.email ?? "") : undefined,
            }
          : null,
      })),
    ])
  );

  return (
    <main className="min-h-screen bg-[var(--background)] p-8 text-[var(--foreground)]">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-3xl font-bold">My Tasks</h1>
          <Link
            href="/dashboard"
            className="rounded-md border border-[var(--border)] bg-[var(--panel)] px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--panel-muted)]"
          >
            Dashboard
          </Link>
        </div>

        <p className="mt-2 text-[var(--text-soft)]">
          Create and manage your TaskFlow tasks.
        </p>

        <section className="mt-6 rounded-lg border border-[var(--border)] bg-[var(--panel)] p-5 shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.12em] text-[var(--text-muted)]">Active workspace</p>
              <h2 className="mt-1 text-xl font-semibold text-[var(--foreground)]">
                {workspace?.name || "Workspace"}
              </h2>
            </div>

            {workspaces.length > 0 && (
              <form action={switchWorkspace} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <label htmlFor="workspaceSwitch" className="text-sm font-medium text-[var(--foreground)]">
                  Switch workspace
                </label>
                <select
                  id="workspaceSwitch"
                  name="workspaceId"
                  defaultValue={String(user.workspaceId || workspaces[0]._id)}
                  className="rounded-md border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-sm text-[var(--foreground)]"
                >
                  {workspaces.map((entry) => (
                    <option key={String(entry._id)} value={String(entry._id)}>
                      {entry.name}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="rounded-md bg-[var(--button-solid)] px-4 py-2 text-sm font-medium text-[var(--button-muted)] hover:bg-[var(--button-solid-hover)]"
                >
                  Open
                </button>
              </form>
            )}
          </div>
        </section>

        {isOwner && (
          <section className="mt-8 rounded-lg border border-[var(--border)] bg-[var(--panel)] p-6 shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
            <h2 className="text-xl font-semibold text-[var(--foreground)]">Create Task</h2>

            <form action={createTask} className="mt-4 space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-[var(--foreground)]">
                  Title
                </label>
                <input
                  id="title"
                  name="title"
                  type="text"
                  required
                  maxLength={200}
                  className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-[var(--foreground)] placeholder:text-[var(--text-muted)]"
                  placeholder="Enter task title"
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-[var(--foreground)]">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={4}
                  maxLength={1000}
                  className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-[var(--foreground)] placeholder:text-[var(--text-muted)]"
                  placeholder="Enter task description"
                />
              </div>

              <div>
                <label htmlFor="priority" className="block text-sm font-medium text-[var(--foreground)]">
                  Priority
                </label>
                <select
                  id="priority"
                  name="priority"
                  defaultValue="medium"
                  className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-[var(--foreground)]"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div>
                <label htmlFor="dueDate" className="block text-sm font-medium text-[var(--foreground)]">
                  Due Date
                </label>
                <input
                  id="dueDate"
                  name="dueDate"
                  type="date"
                  required
                  className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-[var(--foreground)]"
                />
              </div>

              <div>
                <label htmlFor="assignee" className="block text-sm font-medium text-[var(--foreground)]">
                  Assignee
                </label>
                <select
                  id="assignee"
                  name="assignee"
                  defaultValue=""
                  className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-[var(--foreground)]"
                >
                  <option value="">Unassigned</option>
                  {users.map((member) => (
                    <option key={member._id.toString()} value={member._id.toString()}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="tags" className="block text-sm font-medium text-[var(--foreground)]">
                  Tags
                </label>
                <input
                  id="tags"
                  name="tags"
                  type="text"
                  placeholder="frontend, api, urgent"
                  className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-[var(--foreground)] placeholder:text-[var(--text-muted)]"
                />
                <p className="mt-1 text-xs text-[var(--text-muted)]">Separate multiple tags with commas.</p>
              </div>

              <button
                type="submit"
                className="rounded-md bg-[var(--button-solid)] px-5 py-2 text-[var(--button-muted)] hover:bg-[var(--button-solid-hover)]"
              >
                Create Task
              </button>
            </form>
          </section>
        )}

        <section className="mt-8 rounded-lg border border-[var(--border)] bg-[var(--panel)] p-6 shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
          <h2 className="text-xl font-semibold text-[var(--foreground)]">Search & Filters</h2>

          <form method="GET" action="/tasks" className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-[var(--foreground)]">
                Search title
              </label>
              <input
                id="search"
                name="search"
                type="text"
                defaultValue={search}
                placeholder="Search tasks..."
                className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-[var(--foreground)] placeholder:text-[var(--text-muted)]"
              />
            </div>

            <div>
              <label htmlFor="status" className="block text-sm font-medium text-[var(--foreground)]">
                Status
              </label>
              <select
                id="status"
                name="status"
                defaultValue={status}
                className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-[var(--foreground)]"
              >
                <option value="">All statuses</option>
                <option value="todo">Todo</option>
                <option value="in-progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>

            <div>
              <label htmlFor="assignee" className="block text-sm font-medium text-[var(--foreground)]">
                Assignee
              </label>
              <select
                id="assignee"
                name="assignee"
                defaultValue={isOwner ? (assignee && assignee !== "all" ? assignee : "all") : assigneeParam === "mine" ? "mine" : assignee || "all"}
                className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-[var(--foreground)]"
              >
                {!isOwner && <option value="mine">My tasks</option>}
                <option value="all">All assignees</option>
                {users.map((member) => (
                  <option key={member._id.toString()} value={member._id.toString()}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="tag" className="block text-sm font-medium text-[var(--foreground)]">
                Tag
              </label>
              <input
                id="tag"
                name="tag"
                type="text"
                defaultValue={tag}
                placeholder="e.g. frontend"
                className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-[var(--foreground)] placeholder:text-[var(--text-muted)]"
              />
            </div>

            <div>
              <label htmlFor="sort" className="block text-sm font-medium text-[var(--foreground)]">
                Sort
              </label>
              <select
                id="sort"
                name="sort"
                defaultValue={sort}
                className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-[var(--foreground)]"
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="title-asc">Title A-Z</option>
                <option value="title-desc">Title Z-A</option>
              </select>
            </div>

            <div className="flex items-end gap-2 md:col-span-2 lg:col-span-5">
              <button type="submit" className="rounded-md bg-[var(--button-solid)] px-5 py-2 text-[var(--button-muted)] hover:bg-[var(--button-solid-hover)]">
                Apply Filters
              </button>
              <a href="/tasks" className="rounded-md border border-[var(--border)] bg-[var(--panel)] px-5 py-2 text-[var(--foreground)] hover:bg-[var(--panel-muted)]">
                Clear
              </a>
            </div>
          </form>
        </section>

        <section aria-labelledby="kanban-heading" className="mt-8">
          <h2 id="kanban-heading" className="text-xl font-semibold text-[var(--foreground)]">
            Task Board
          </h2>

          <TaskBoard
            initialTasks={serializedTasks as any}
            users={serializedUsers as any}
            isOwner={isOwner}
            currentUserId={user._id.toString()}
            commentsByTask={serializedCommentsByTask as any}
          />
        </section>
      </div>
    </main>
  );
}