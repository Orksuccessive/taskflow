import mongoose from "mongoose";

import { connectDB } from "@/lib/mongodb";
import Task from "@/models/Task";
import Workspace from "@/models/Workspace";

function buildStatusSummary(stats: Array<{ _id: string; count: number }>) {
  const tasksByStatus = {
    todo: 0,
    "in-progress": 0,
    done: 0,
  };

  for (const item of stats) {
    if (item._id in tasksByStatus) {
      tasksByStatus[item._id as keyof typeof tasksByStatus] = item.count;
    }
  }

  return tasksByStatus;
}

function buildPrioritySummary(stats: Array<{ _id: string; count: number }>) {
  const priorityStats = {
    low: 0,
    medium: 0,
    high: 0,
  };

  for (const item of stats) {
    if (item._id in priorityStats) {
      priorityStats[item._id as keyof typeof priorityStats] = item.count;
    }
  }

  return priorityStats;
}

async function getTaskSummary(
  match: Record<string, unknown>,
  topAssigneeMatch: Record<string, unknown> = match
) {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);

  const [statusStats, dueThisWeek, overdue, priorityDistribution, completionRate, topAssignees] =
    await Promise.all([
      Task.aggregate([
        { $match: match },
        { $group: { _id: "$status", count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),

      Task.countDocuments({
        ...match,
        dueDate: {
          $gte: startOfWeek,
          $lt: endOfWeek,
        },
      }),

      Task.countDocuments({
        ...match,
        dueDate: {
          $lt: now,
        },
        status: { $ne: "done" },
      }),

      Task.aggregate([
        { $match: match },
        { $group: { _id: "$priority", count: { $sum: 1 } } },
      ]),

      Task.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            completed: {
              $sum: {
                $cond: [{ $eq: ["$status", "done"] }, 1, 0],
              },
            },
          },
        },
      ]),

      Task.aggregate([
        {
          $match: {
            ...topAssigneeMatch,
            assignee: { $ne: null },
          },
        },
        { $group: { _id: "$assignee", taskCount: { $sum: 1 } } },
        { $sort: { taskCount: -1 } },
        { $limit: 5 },
        { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "assignee" } },
        { $unwind: "$assignee" },
        {
          $project: {
            _id: 1,
            taskCount: 1,
            name: "$assignee.name",
            email: "$assignee.email",
          },
        },
      ]),
    ]);

  const tasksByStatus = buildStatusSummary(statusStats);
  const priorityStats = buildPrioritySummary(priorityDistribution);
  const totalTasks = completionRate[0]?.total || 0;
  const completedTasks = completionRate[0]?.completed || 0;

  return {
    tasksByStatus,
    dueThisWeek,
    overdue,
    completionRate: totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0,
    priorityStats,
    topAssignees,
  };
}

export async function getDashboardStats(
  userId: mongoose.Types.ObjectId,
  workspaceId?: mongoose.Types.ObjectId | null
) {
  await connectDB();

  const personalMatch = { assignee: userId };
  const workspaceMatch = workspaceId ? { workspaceId } : personalMatch;

  const personalTopAssigneeWorkspace = workspaceId
    ? await Workspace.findById(workspaceId)
    : null;

  const workspaceMemberIds = personalTopAssigneeWorkspace?.members && Array.isArray(personalTopAssigneeWorkspace.members)
    ? personalTopAssigneeWorkspace.members.map((memberId) => new mongoose.Types.ObjectId(String(memberId)))
    : [];

  const personalTopAssigneeMatch = workspaceId && workspaceMemberIds.length
    ? { workspaceId, assignee: { $in: workspaceMemberIds } }
    : personalMatch;

  const [personal, workspace] = await Promise.all([
    getTaskSummary(personalMatch, personalTopAssigneeMatch),
    getTaskSummary(workspaceMatch, workspaceMatch),
  ]);

  return {
    personal,
    workspace,
    tasksByStatus: workspace.tasksByStatus,
    dueThisWeek: workspace.dueThisWeek,
    overdue: workspace.overdue,
    completionRate: workspace.completionRate,
    priorityStats: workspace.priorityStats,
    topAssignees: workspace.topAssignees,
  };
}