import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/mongodb";
import Task from "@/models/Task";
import mongoose from "mongoose";
import {
  createTask,
  updateTask,
  deleteTask,
} from "./actions";

export default async function TasksPage() {
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

  const tasks = await Task.find({
    userId: user._id,
  })
    .sort({ createdAt: -1 })
    .lean();

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-bold">My Tasks</h1>

        <p className="mt-2 text-gray-600">
          Create and manage your TaskFlow tasks.
        </p>

        {/* Create Task */}
        <section className="mt-8 rounded-lg bg-white p-6 shadow">
          <h2 className="text-xl font-semibold">
            Create Task
          </h2>

          <form action={createTask} className="mt-4 space-y-4">
            <div>
              <label
                htmlFor="title"
                className="block text-sm font-medium"
              >
                Title
              </label>

              <input
                id="title"
                name="title"
                type="text"
                required
                maxLength={200}
                className="mt-1 w-full rounded-md border px-3 py-2"
                placeholder="Enter task title"
              />
            </div>

            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium"
              >
                Description
              </label>

              <textarea
                id="description"
                name="description"
                rows={4}
                maxLength={1000}
                className="mt-1 w-full rounded-md border px-3 py-2"
                placeholder="Enter task description"
              />
            </div>

            <div>
              <label
                htmlFor="priority"
                className="block text-sm font-medium"
              >
                Priority
              </label>

              <select
                id="priority"
                name="priority"
                defaultValue="medium"
                className="mt-1 rounded-md border px-3 py-2"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="dueDate"
                className="block text-sm font-medium"
              >
                Due Date
              </label>

              <input
                id="dueDate"
                name="dueDate"
                type="date"
                className="mt-1 rounded-md border px-3 py-2"
              />
            </div>

            <button
              type="submit"
              className="rounded-md bg-black px-5 py-2 text-white hover:bg-gray-800"
            >
              Create Task
            </button>
          </form>
        </section>

{/* Task List */}
<section className="mt-8">
  <div className="flex items-center justify-between">
    <h2 className="text-xl font-semibold">
      Your Tasks
    </h2>

    <span className="text-sm text-gray-600">
      {tasks.length} task{tasks.length !== 1 ? "s" : ""}
    </span>
  </div>

  {tasks.length === 0 ? (
    <div className="mt-4 rounded-lg border border-dashed p-8 text-center text-gray-500">
      No tasks yet. Create your first task above.
    </div>
  ) : (
    <div className="mt-4 space-y-6">
      {tasks.map((task) => (
        <div
          key={task._id.toString()}
          className="rounded-lg bg-white p-5 shadow"
        >
          <h3 className="text-lg font-semibold">
            {task.title}
          </h3>

          {task.description && (
            <p className="mt-2 text-gray-600">
              {task.description}
            </p>
          )}

          <div className="mt-3 flex gap-3 text-sm">
            <span className="rounded bg-gray-100 px-2 py-1">
              Status: {task.status}
            </span>

            <span className="rounded bg-gray-100 px-2 py-1">
              Priority: {task.priority}
            </span>
          </div>

          {task.dueDate && (
            <p className="mt-2 text-sm text-gray-500">
              Due:{" "}
              {new Date(task.dueDate).toLocaleDateString()}
            </p>
          )}

          {/* Edit Task */}
          <div className="mt-5 border-t pt-5">
            <h4 className="font-medium">
              Edit Task
            </h4>

            <form
              action={updateTask}
              className="mt-4 space-y-4"
            >
              <input
                type="hidden"
                name="taskId"
                value={task._id.toString()}
              />

              <div>
                <label
                  htmlFor={`title-${task._id}`}
                  className="block text-sm font-medium"
                >
                  Title
                </label>

                <input
                  id={`title-${task._id}`}
                  name="title"
                  type="text"
                  required
                  maxLength={200}
                  defaultValue={task.title}
                  className="mt-1 w-full rounded-md border px-3 py-2"
                />
              </div>

              <div>
                <label
                  htmlFor={`description-${task._id}`}
                  className="block text-sm font-medium"
                >
                  Description
                </label>

                <textarea
                  id={`description-${task._id}`}
                  name="description"
                  rows={3}
                  maxLength={1000}
                  defaultValue={task.description || ""}
                  className="mt-1 w-full rounded-md border px-3 py-2"
                />
              </div>

              <div>
                <label
                  htmlFor={`status-${task._id}`}
                  className="block text-sm font-medium"
                >
                  Status
                </label>

                <select
                  id={`status-${task._id}`}
                  name="status"
                  defaultValue={task.status}
                  className="mt-1 rounded-md border px-3 py-2"
                >
                  <option value="todo">Todo</option>
                  <option value="in-progress">
                    In Progress
                  </option>
                  <option value="done">Done</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor={`priority-${task._id}`}
                  className="block text-sm font-medium"
                >
                  Priority
                </label>

                <select
                  id={`priority-${task._id}`}
                  name="priority"
                  defaultValue={task.priority}
                  className="mt-1 rounded-md border px-3 py-2"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor={`dueDate-${task._id}`}
                  className="block text-sm font-medium"
                >
                  Due Date
                </label>

                <input
                  id={`dueDate-${task._id}`}
                  name="dueDate"
                  type="date"
                  defaultValue={
                    task.dueDate
                      ? new Date(task.dueDate)
                          .toISOString()
                          .split("T")[0]
                      : ""
                  }
                  className="mt-1 rounded-md border px-3 py-2"
                />
              </div>

              <button
                type="submit"
                className="rounded-md bg-blue-600 px-5 py-2 text-white hover:bg-blue-700"
              >
                Update Task
              </button>
            </form>
            <form action={deleteTask} className="mt-3">
  <input
    type="hidden"
    name="taskId"
    value={task._id.toString()}
  />

  <button
    type="submit"
    className="rounded-md bg-red-600 px-5 py-2 text-white hover:bg-red-700"
  >
    Delete Task
  </button>
</form>
          </div>
        </div>
      ))}
    </div>
  )}
</section>
      </div>
    </main>
  );
}