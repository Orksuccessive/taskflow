import mongoose from "mongoose";

import { connectDB } from "@/lib/mongodb";
import Task from "@/models/Task";

export async function getDashboardStats(
  userId: mongoose.Types.ObjectId
) {
  await connectDB();

  const now = new Date();

  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);

  const [statusStats, dueThisWeek, topAssignees] =
    await Promise.all([
      Task.aggregate([
        {
          $match: {
            userId,
          },
        },
        {
          $group: {
            _id: "$status",
            count: {
              $sum: 1,
            },
          },
        },
        {
          $sort: {
            _id: 1,
          },
        },
      ]),

      Task.countDocuments({
        userId,
        dueDate: {
          $gte: startOfWeek,
          $lt: endOfWeek,
        },
      }),

      Task.aggregate([
        {
          $match: {
            userId,
            assignee: {
              $ne: null,
            },
          },
        },
        {
          $group: {
            _id: "$assignee",
            taskCount: {
              $sum: 1,
            },
          },
        },
        {
          $sort: {
            taskCount: -1,
          },
        },
        {
          $limit: 5,
        },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "assignee",
          },
        },
        {
          $unwind: "$assignee",
        },
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

  const tasksByStatus = {
    todo: 0,
    "in-progress": 0,
    done: 0,
  };

  for (const item of statusStats) {
    if (item._id in tasksByStatus) {
      tasksByStatus[
        item._id as keyof typeof tasksByStatus
      ] = item.count;
    }
  }

  return {
    tasksByStatus,
    dueThisWeek,
    topAssignees,
  };
}