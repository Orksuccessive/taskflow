import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { getDashboardStats } from "@/lib/dashboard";

export default async function DashboardStats() {
  const session = await auth();

  if (!session?.user?.email) {
    return null;
  }

  await connectDB();

  const user = await User.findOne({
    email: session.user.email,
  }).lean();

  if (!user) {
    return null;
  }

  const stats = await getDashboardStats(user._id);

  return (
    <>
      <section
        aria-labelledby="stats-heading"
        className="mt-8"
      >
        <h2
          id="stats-heading"
          className="sr-only"
        >
          Task statistics
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-white p-5 shadow">
            <p className="text-sm text-gray-500">Todo</p>
            <p className="mt-2 text-3xl font-bold">
              {stats.tasksByStatus.todo}
            </p>
          </div>

          <div className="rounded-lg bg-white p-5 shadow">
            <p className="text-sm text-gray-500">
              In Progress
            </p>
            <p className="mt-2 text-3xl font-bold">
              {stats.tasksByStatus["in-progress"]}
            </p>
          </div>

          <div className="rounded-lg bg-white p-5 shadow">
            <p className="text-sm text-gray-500">Done</p>
            <p className="mt-2 text-3xl font-bold">
              {stats.tasksByStatus.done}
            </p>
          </div>

          <div className="rounded-lg bg-white p-5 shadow">
            <p className="text-sm text-gray-500">
              Due This Week
            </p>
            <p className="mt-2 text-3xl font-bold">
              {stats.dueThisWeek}
            </p>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="assignees-heading"
        className="mt-8 rounded-lg bg-white p-6 shadow"
      >
        <h2
          id="assignees-heading"
          className="text-xl font-semibold"
        >
          Top Assignees
        </h2>

        {stats.topAssignees.length === 0 ? (
          <p className="mt-4 text-gray-500">
            No assigned tasks yet.
          </p>
        ) : (
          <div className="mt-4 divide-y">
            {stats.topAssignees.map((assignee) => (
              <div
                key={assignee._id.toString()}
                className="flex items-center justify-between py-3"
              >
                <div>
                  <p className="font-medium">
                    {assignee.name}
                  </p>

                  <p className="text-sm text-gray-500">
                    {assignee.email}
                  </p>
                </div>

                <span className="rounded-full bg-gray-100 px-3 py-1 text-sm">
                  {assignee.taskCount} tasks
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}