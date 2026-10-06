import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { getDashboardStats } from "@/lib/dashboard";

function StatSummary({
  label,
  value,
  suffix = "",
}: {
  label: string;
  value: number;
  suffix?: string;
}) {
  return (
    <div className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-900">
        {value}
        {suffix}
      </p>
    </div>
  );
}

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

  const stats = await getDashboardStats(user._id, user.workspaceId || null);
  const personalStats = stats.personal;
  const workspaceStats = stats.workspace;

  const renderPriorityList = (summary: typeof workspaceStats) => [
    { label: "Low", value: summary.priorityStats.low },
    { label: "Medium", value: summary.priorityStats.medium },
    { label: "High", value: summary.priorityStats.high },
  ];

  return (
    <>
      <section aria-labelledby="stats-heading" className="mt-8 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <h2 id="stats-heading" className="text-xl font-semibold text-slate-900">
            Personal overview
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <StatSummary label="Todo" value={personalStats.tasksByStatus.todo} />
          <StatSummary label="In Progress" value={personalStats.tasksByStatus["in-progress"]} />
          <StatSummary label="Done" value={personalStats.tasksByStatus.done} />
          <StatSummary label="Due This Week" value={personalStats.dueThisWeek} />
          <StatSummary label="Overdue" value={personalStats.overdue} />
          <StatSummary label="Completion" value={personalStats.completionRate} suffix="%" />
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">Priority mix</h2>

          <div className="mt-4 space-y-3">
            {renderPriorityList(personalStats).map((item) => (
              <div key={item.label}>
                <div className="mb-1 flex items-center justify-between text-sm text-slate-600">
                  <span>{item.label}</span>
                  <span>{item.value}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-blue-600"
                    style={{
                      width: `${Math.max(
                        10,
                        (item.value /
                          Math.max(
                            1,
                            Object.values(personalStats.priorityStats).reduce(
                              (sum, value) => sum + value,
                              0
                            )
                          )) *
                          100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 id="assignees-heading" className="text-xl font-semibold text-slate-900">
            Top Assignees
          </h2>

          {personalStats.topAssignees.length === 0 ? (
            <p className="mt-4 text-slate-500">No assigned tasks yet.</p>
          ) : (
            <div className="mt-4 divide-y divide-slate-200">
              {personalStats.topAssignees.map((assignee) => (
                <div key={assignee._id.toString()} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-slate-800">{assignee.name}</p>
                    <p className="text-sm text-slate-500">{assignee.email}</p>
                  </div>

                  <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                    {assignee.taskCount} tasks
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {user.workspaceId && (
        <section className="mt-8 rounded-lg bg-slate-900 p-6 text-slate-50 shadow-sm ring-1 ring-slate-700">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Workspace overview</h2>
            <span className="rounded-full bg-slate-700 px-3 py-1 text-sm text-slate-200">Team</span>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            <StatSummary label="Todo" value={workspaceStats.tasksByStatus.todo} />
            <StatSummary label="In Progress" value={workspaceStats.tasksByStatus["in-progress"]} />
            <StatSummary label="Done" value={workspaceStats.tasksByStatus.done} />
            <StatSummary label="Due This Week" value={workspaceStats.dueThisWeek} />
            <StatSummary label="Overdue" value={workspaceStats.overdue} />
            <StatSummary label="Completion" value={workspaceStats.completionRate} suffix="%" />
          </div>
        </section>
      )}
    </>
  );
}
