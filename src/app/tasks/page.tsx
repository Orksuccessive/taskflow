import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/mongodb";
import Task from "@/models/Task";
import mongoose from "mongoose";
import {
  createTask,
  updateTask,
  deleteTask,
  updateTaskStatus,
  createComment,
} from "./actions";
import Comment from "@/models/Comment";

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

  const params = await searchParams;

  const search = params.search?.trim() || "";
  const status = params.status || "";
  const assignee = params.assignee || "";
  const tag = params.tag?.trim() || "";
  const sort = params.sort || "newest";

  const query: Record<string, unknown> = {
    userId: user._id,
  };

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

  if (assignee && mongoose.isValidObjectId(assignee)) {
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

  // Get users that can be assigned to tasks
  const users = await User.find({})
      .select("_id name email")
      .sort({ name: 1 })
      .lean() as unknown as Array<{
    _id: mongoose.Types.ObjectId;
    name: string;
    email: string;
  }>;

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

            <div>
  <label
    htmlFor="assignee"
    className="block text-sm font-medium"
  >
    Assignee
  </label>

  <select
    id="assignee"
    name="assignee"
    defaultValue=""
    className="mt-1 w-full rounded-md border px-3 py-2"
  >
    <option value="">Unassigned</option>

    {users.map((user) => (
      <option
        key={user._id.toString()}
        value={user._id.toString()}
      >
        {user.name}
      </option>
    ))}
  </select>
</div>

<div>
  <label
    htmlFor="tags"
    className="block text-sm font-medium"
  >
    Tags
  </label>

  <input
    id="tags"
    name="tags"
    type="text"
    placeholder="frontend, api, urgent"
    className="mt-1 w-full rounded-md border px-3 py-2"
  />

  <p className="mt-1 text-xs text-gray-500">
    Separate multiple tags with commas.
  </p>
</div>


            <button
              type="submit"
              className="rounded-md bg-black px-5 py-2 text-white hover:bg-gray-800"
            >
              Create Task
            </button>
          </form>
        </section>

        <section className="mt-8 rounded-lg bg-white p-6 shadow">
  <h2 className="text-xl font-semibold">
    Search & Filters
  </h2>

  <form
    method="GET"
    action="/tasks"
    className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-5"
  >
    {/* Search */}
    <div>
      <label
        htmlFor="search"
        className="block text-sm font-medium"
      >
        Search title
      </label>

      <input
        id="search"
        name="search"
        type="text"
        defaultValue={search}
        placeholder="Search tasks..."
        className="mt-1 w-full rounded-md border px-3 py-2"
      />
    </div>

    {/* Status */}
    <div>
      <label
        htmlFor="status"
        className="block text-sm font-medium"
      >
        Status
      </label>

      <select
        id="status"
        name="status"
        defaultValue={status}
        className="mt-1 w-full rounded-md border px-3 py-2"
      >
        <option value="">All statuses</option>
        <option value="todo">Todo</option>
        <option value="in-progress">In Progress</option>
        <option value="done">Done</option>
      </select>
    </div>

    {/* Assignee */}
    <div>
      <label
        htmlFor="assignee"
        className="block text-sm font-medium"
      >
        Assignee
      </label>

      <select
        id="assignee"
        name="assignee"
        defaultValue={assignee}
        className="mt-1 w-full rounded-md border px-3 py-2"
      >
        <option value="">All assignees</option>

        {users.map((user) => (
          <option
            key={user._id.toString()}
            value={user._id.toString()}
          >
            {user.name}
          </option>
        ))}
      </select>
    </div>

    {/* Tag */}
    <div>
      <label
        htmlFor="tag"
        className="block text-sm font-medium"
      >
        Tag
      </label>

      <input
        id="tag"
        name="tag"
        type="text"
        defaultValue={tag}
        placeholder="e.g. frontend"
        className="mt-1 w-full rounded-md border px-3 py-2"
      />
    </div>

    {/* Sort */}
    <div>
      <label
        htmlFor="sort"
        className="block text-sm font-medium"
      >
        Sort
      </label>

      <select
        id="sort"
        name="sort"
        defaultValue={sort}
        className="mt-1 w-full rounded-md border px-3 py-2"
      >
        <option value="newest">
          Newest
        </option>

        <option value="oldest">
          Oldest
        </option>

        <option value="title-asc">
          Title A-Z
        </option>

        <option value="title-desc">
          Title Z-A
        </option>
      </select>
    </div>

    <div className="flex items-end gap-2 md:col-span-2 lg:col-span-5">
      <button
        type="submit"
        className="rounded-md bg-black px-5 py-2 text-white hover:bg-gray-800"
      >
        Apply Filters
      </button>

      <a
        href="/tasks"
        className="rounded-md border px-5 py-2 hover:bg-gray-50"
      >
        Clear
      </a>
    </div>
  </form>
</section>

{/* Kanban Board */}
<section aria-labelledby="kanban-heading"
        className="mt-8">
  <h2 
    id="kanban-heading" 
    className="text-xl font-semibold">
    Task Board
  </h2>

  <div className="mt-4 grid gap-6 md:grid-cols-3">
    {[
      {
        status: "todo",
        title: "Todo",
      },
      {
        status: "in-progress",
        title: "In Progress",
      },
      {
        status: "done",
        title: "Done",
      },
    ].map((column) => {
      const columnTasks = tasks.filter(
        (task) => task.status === column.status
      );

      return (
        <div
          key={column.status}
          className="rounded-lg bg-gray-100 p-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">
              {column.title}
            </h3>

            <span className="text-sm text-gray-500">
              {columnTasks.length}
            </span>
          </div>

          <div className="mt-4 space-y-4">
            {columnTasks.length === 0 ? (
              <div className="rounded-md border border-dashed bg-white p-4 text-center text-sm text-gray-500">
                No tasks
              </div>
            ) : (
              columnTasks.map((task) => (
               <div
  key={task._id.toString()}
  className="rounded-lg bg-white p-4 shadow-sm"
>
  <h4 className="font-semibold">
    {task.title}
  </h4>

  {task.description && (
    <p className="mt-2 text-sm text-gray-600">
      {task.description}
    </p>
  )}

  <div className="mt-3 flex gap-2 text-xs">
    <span className="rounded bg-gray-100 px-2 py-1">
      {task.priority}
    </span>

    {task.tags?.map((tag) => (
      <span
        key={tag}
        className="rounded bg-blue-100 px-2 py-1"
      >
        #{tag}
      </span>
    ))}
  </div>

  {/* Change Status */}
  <form
    action={updateTaskStatus}
    className="mt-4"
  >
    <input
      type="hidden"
      name="taskId"
      value={task._id.toString()}
    />

    <label
      htmlFor={`status-${task._id}`}
      className="block text-xs font-medium text-gray-600"
    >
      Move task
    </label>

    <select
      id={`status-${task._id}`}
      name="status"
      defaultValue={task.status}
      className="mt-1 w-full rounded-md border px-2 py-2 text-sm"
    >
      <option value="todo">Todo</option>
      <option value="in-progress">In Progress</option>
      <option value="done">Done</option>
    </select>

    <button
      type="submit"
      className="mt-2 w-full rounded-md bg-black px-3 py-2 text-sm text-white hover:bg-gray-800"
    >
      Update Status
    </button>
  </form>

  {/* Edit Task */}
  <details className="mt-4">
    <summary className="cursor-pointer text-sm font-medium">
      Edit Task
    </summary>

    <form
      action={updateTask}
      className="mt-3 space-y-3"
    >
      <input
        type="hidden"
        name="taskId"
        value={task._id.toString()}
      />

      <input
        name="title"
        type="text"
        required
        maxLength={200}
        defaultValue={task.title}
        className="w-full rounded-md border px-3 py-2 text-sm"
        placeholder="Title"
      />

      <textarea
        name="description"
        rows={3}
        maxLength={1000}
        defaultValue={task.description || ""}
        className="w-full rounded-md border px-3 py-2 text-sm"
        placeholder="Description"
      />

      <select
        name="status"
        defaultValue={task.status}
        className="w-full rounded-md border px-3 py-2 text-sm"
      >
        <option value="todo">Todo</option>
        <option value="in-progress">In Progress</option>
        <option value="done">Done</option>
      </select>

      <select
        name="priority"
        defaultValue={task.priority}
        className="w-full rounded-md border px-3 py-2 text-sm"
      >
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
      </select>

      <input
        name="dueDate"
        type="date"
        defaultValue={
          task.dueDate
            ? new Date(task.dueDate)
                .toISOString()
                .split("T")[0]
            : ""
        }
        className="w-full rounded-md border px-3 py-2 text-sm"
      />


        <div>
  <label className="block text-sm font-medium">
    Assignee
  </label>

  <select
    name="assignee"
    defaultValue={
      task.assignee
        ? task.assignee.toString()
        : ""
    }
    className="mt-1 w-full rounded-md border px-3 py-2"
  >
    <option value="">Unassigned</option>

    {users.map((user) => (
      <option
        key={user._id.toString()}
        value={user._id.toString()}
      >
        {user.name}
      </option>
    ))}
  </select>
</div>


<div>
  <label className="block text-sm font-medium">
    Tags
  </label>

  <input
    name="tags"
    type="text"
    defaultValue={task.tags.join(", ")}
    placeholder="frontend, api, urgent"
    className="mt-1 w-full rounded-md border px-3 py-2"
  />

  <p className="mt-1 text-xs text-gray-500">
    Separate multiple tags with commas.
  </p>
</div>


      <button
        type="submit"
        className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
      >
        Save Changes
      </button>
    </form>
  </details>

  {/* Delete Task */}
  <form
    action={deleteTask}
    className="mt-3"
  >
    <input
      type="hidden"
      name="taskId"
      value={task._id.toString()}
    />

    <button
      type="submit"
      className="w-full rounded-md bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700"
    >
      Delete Task
    </button>
  </form>
  
  <div className="mt-4 border-t pt-4">
  <h4 className="text-sm font-semibold">
    Comments
  </h4>

  <div className="mt-3 space-y-3">
    {(commentsByTask.get(task._id.toString()) || []).map(
      (comment) => {
        const author = comment.authorId as {
          name?: string;
          email?: string;
        };

        return (
          <div
            key={comment._id.toString()}
            className="rounded-md bg-gray-50 p-3"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                {author?.name || author?.email || "Unknown user"}
              </p>

              <time className="text-xs text-gray-500">
                {new Date(comment.createdAt).toLocaleString()}
              </time>
            </div>

            <p className="mt-1 text-sm text-gray-700">
              {comment.content}
            </p>
          </div>
        );
      }
    )}
  </div>

  <form
    action={createComment}
    className="mt-4 space-y-2"
  >
    <input
      type="hidden"
      name="taskId"
      value={task._id.toString()}
    />

    <textarea
      name="content"
      required
      maxLength={1000}
      placeholder="Write a comment..."
      className="w-full rounded-md border px-3 py-2 text-sm"
      rows={2}
    />

    <button
      type="submit"
      className="rounded-md bg-black px-3 py-2 text-sm text-white hover:bg-gray-800"
    >
      Add Comment
    </button>
  </form>
</div>

</div>    



          ))
            )}
          </div>
        </div>
      );
    })}
  </div>
</section>
      </div>
    </main>
  );
}