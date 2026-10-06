"use client";

import { useState, useTransition, useEffect } from "react";

import {
  createComment,
  deleteTask,
  updateTask,
  updateTaskStatus,
} from "@/app/tasks/actions";

type TaskItem = {
  _id: string;
  title: string;
  description?: string;
  status: "todo" | "in-progress" | "done";
  priority: "low" | "medium" | "high";
  tags?: string[];
  dueDate?: string | null;
  assignee?: { _id?: string; name?: string; email?: string } | null;
};

type CommentItem = {
  _id: string;
  content: string;
  createdAt: string;
  authorId?: { name?: string; email?: string } | null;
};

type TaskBoardProps = Readonly<{
  initialTasks: TaskItem[];
  users: Array<{ _id: string; name: string; email: string }>;
  isOwner: boolean;
  currentUserId: string;
  commentsByTask: Record<string, CommentItem[]>;
}>;

export default function TaskBoard({
  initialTasks,
  users,
  isOwner,
  currentUserId,
  commentsByTask,
}: TaskBoardProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  const columns = [
    { key: "todo", label: "Todo" },
    { key: "in-progress", label: "In Progress" },
    { key: "done", label: "Done" },
  ] as const;

  const handleDrop = (status: "todo" | "in-progress" | "done") => {
    if (!draggingTaskId) return;

    const task = tasks.find((item) => item._id === draggingTaskId);

    if (!task || task.status === status) {
      setDraggingTaskId(null);
      return;
    }

    setTasks((currentTasks) =>
      currentTasks.map((item) =>
        item._id === draggingTaskId ? { ...item, status } : item
      )
    );

    startTransition(() => {
      const formData = new FormData();
      formData.set("taskId", draggingTaskId);
      formData.set("status", status);
      void updateTaskStatus(formData);
    });

    setDraggingTaskId(null);
  };

  return (
    <div className="mt-6 grid gap-6 md:grid-cols-3">
      {columns.map((column) => {
        const columnTasks = tasks.filter((task) => task.status === column.key);

        return (
          <div
            key={column.key}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
            }}
            onDrop={() => void handleDrop(column.key)}
            className="task-column rounded-2xl border border-[var(--border)] bg-[var(--board-column)] p-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[var(--foreground)]">{column.label}</h3>
              <span className="rounded-full bg-[var(--panel)] px-2.5 py-1 text-sm font-medium text-[var(--text-soft)]">
                {columnTasks.length}
              </span>
            </div>

            <div className="mt-4 space-y-4">
              {columnTasks.length === 0 ? (
                <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--panel)] p-4 text-center text-sm text-[var(--text-muted)]">
                  No tasks here yet
                </div>
              ) : (
                columnTasks.map((task) => {
                  const canChangeStatus = isOwner || task.assignee?._id === currentUserId;

                  return (
                    <div
                      key={task._id}
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", task._id);
                        setDraggingTaskId(task._id);
                      }}
                      onDragEnd={() => setDraggingTaskId(null)}
                      className="task-card cursor-grab rounded-xl border border-[var(--border)] bg-[var(--board-card)] p-4 shadow-[0_8px_18px_rgba(15,23,42,0.08)] ring-1 ring-transparent active:cursor-grabbing"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h4 className="font-semibold text-[var(--foreground)]">{task.title}</h4>
                        <span className="rounded-full bg-[var(--panel-muted)] px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-soft)]">
                          {task.priority}
                        </span>
                      </div>

                      {task.description && (
                        <p className="mt-2 text-sm text-[var(--text-soft)]">{task.description}</p>
                      )}

                      <div className="mt-3 flex flex-wrap gap-2">
                        {task.tags?.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-blue-100 px-2 py-1 text-[10px] font-medium text-blue-700"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>

                      {task.assignee && (
                        <p className="mt-3 text-xs text-[var(--text-muted)]">
                          Assigned to {task.assignee.name || task.assignee.email || "Team member"}
                        </p>
                      )}

                      {canChangeStatus && (
                        <form action={updateTaskStatus} className="mt-4 space-y-2">
                          <input type="hidden" name="taskId" value={task._id} />
                          <label className="block text-xs font-medium text-[var(--text-soft)]">
                            Move task
                          </label>
                          <select
                            name="status"
                            defaultValue={task.status}
                            className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--panel)] px-2 py-2 text-sm text-[var(--foreground)]"
                          >
                            <option value="todo">Todo</option>
                            <option value="in-progress">In Progress</option>
                            <option value="done">Done</option>
                          </select>
                          <button
                            type="submit"
                            className="w-full rounded-md bg-[var(--button-solid)] px-3 py-2 text-sm font-medium text-[var(--button-muted)] hover:bg-[var(--button-solid-hover)]"
                          >
                            Update Status
                          </button>
                        </form>
                      )}

                      {isOwner && (
                        <>
                          <details className="mt-4">
                            <summary className="cursor-pointer text-sm font-medium text-[var(--foreground)]">
                              Edit Task
                            </summary>

                            <form action={updateTask} className="mt-3 space-y-3">
                              <input type="hidden" name="taskId" value={task._id} />

                              <input
                                name="title"
                                type="text"
                                required
                                maxLength={200}
                                defaultValue={task.title}
                                className="w-full rounded-md border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-sm text-[var(--foreground)]"
                              />

                              <textarea
                                name="description"
                                rows={3}
                                maxLength={1000}
                                defaultValue={task.description || ""}
                                className="w-full rounded-md border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-sm text-[var(--foreground)]"
                              />

                              <select
                                name="status"
                                defaultValue={task.status}
                                className="w-full rounded-md border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-sm text-[var(--foreground)]"
                              >
                                <option value="todo">Todo</option>
                                <option value="in-progress">In Progress</option>
                                <option value="done">Done</option>
                              </select>

                              <select
                                name="priority"
                                defaultValue={task.priority}
                                className="w-full rounded-md border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-sm text-[var(--foreground)]"
                              >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                              </select>

                              <input
                                name="dueDate"
                                type="date"
                                defaultValue={task.dueDate || ""}
                                className="w-full rounded-md border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-sm text-[var(--foreground)]"
                              />

                              <select
                                name="assignee"
                                defaultValue={task.assignee?._id || ""}
                                className="w-full rounded-md border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-sm text-[var(--foreground)]"
                              >
                                <option value="">Unassigned</option>
                                {users.map((user) => (
                                  <option key={user._id} value={user._id}>
                                    {user.name}
                                  </option>
                                ))}
                              </select>

                              <input
                                name="tags"
                                type="text"
                                defaultValue={task.tags?.join(", ") || ""}
                                placeholder="frontend, api, urgent"
                                className="w-full rounded-md border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-sm text-[var(--foreground)]"
                              />

                              <button
                                type="submit"
                                className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                              >
                                Save Changes
                              </button>
                            </form>
                          </details>

                          <form action={deleteTask} className="mt-3">
                            <input type="hidden" name="taskId" value={task._id} />
                            <button
                              type="submit"
                              className="w-full rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
                            >
                              Delete Task
                            </button>
                          </form>
                        </>
                      )}

                      <div className="mt-4 border-t border-[var(--border)] pt-4">
                        <h4 className="text-sm font-semibold text-[var(--foreground)]">Comments</h4>
                        <div className="mt-3 space-y-3">
                          {(commentsByTask[task._id] || []).map((comment) => (
                            <div key={comment._id} className="rounded-md bg-[var(--panel-muted)] p-3">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-medium text-[var(--foreground)]">
                                  {comment.authorId?.name || comment.authorId?.email || "Unknown user"}
                                </p>
                                <time className="text-xs text-[var(--text-muted)]">
                                  {new Date(comment.createdAt).toLocaleString()}
                                </time>
                              </div>
                              <p className="mt-1 text-sm text-[var(--text-soft)]">{comment.content}</p>
                            </div>
                          ))}
                        </div>

                        <form action={createComment} className="mt-4 space-y-2">
                          <input type="hidden" name="taskId" value={task._id} />
                          <textarea
                            name="content"
                            required
                            maxLength={1000}
                            placeholder="Write a comment..."
                            rows={2}
                            className="w-full rounded-md border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-sm text-[var(--foreground)]"
                          />
                          <button
                            type="submit"
                            className="rounded-md bg-[var(--button-solid)] px-3 py-2 text-sm font-medium text-[var(--button-muted)] hover:bg-[var(--button-solid-hover)]"
                          >
                            Add Comment
                          </button>
                        </form>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
