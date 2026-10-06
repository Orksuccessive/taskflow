"use server";

import mongoose from "mongoose";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import Comment from "@/models/Comment";
import Task from "@/models/Task";
import User from "@/models/User";
import Workspace from "@/models/Workspace";

const TASKS_PATH = "/tasks";

function createInviteCode() {
  return Array.from({ length: 8 }, () =>
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[
      Math.floor(Math.random() * 32)
    ]
  ).join("");
}

async function ensureWorkspaceForUser(user: {
  _id: mongoose.Types.ObjectId;
  name?: string;
  workspaceId?: mongoose.Types.ObjectId | null;
  workspaceIds?: mongoose.Types.ObjectId[];
  save?: () => Promise<unknown>;
}) {
  if (user.workspaceId) {
    const existingWorkspaceIds = Array.isArray(user.workspaceIds) ? user.workspaceIds : [];
    if (!existingWorkspaceIds.some((workspaceId) => workspaceId.toString() === user.workspaceId!.toString())) {
      user.workspaceIds = [...existingWorkspaceIds, user.workspaceId];
    }
    return user.workspaceId;
  }

  const workspace = await Workspace.create({
    name: user.name ? `${user.name}'s workspace` : "My workspace",
    inviteCode: createInviteCode(),
    ownerId: user._id,
    members: [user._id],
  });

  user.workspaceId = workspace._id;
  user.workspaceIds = Array.isArray(user.workspaceIds) ? [...user.workspaceIds, workspace._id] : [workspace._id];

  if (typeof user.save === "function") {
    await user.save();
  }

  return user.workspaceId;
}

async function getAuthenticatedUser() {
  const session = await auth();

  if (!session?.user?.email) {
    throw new Error("Unauthorized");
  }

  await connectDB();

  const user = await User.findOne({
    email: session.user.email.toLowerCase().trim(),
  });

  if (!user) {
    throw new Error("User not found");
  }

  const workspaceIds = Array.isArray(user.workspaceIds) ? user.workspaceIds : [];
  const activeWorkspaceId = user.workspaceId;

  if (activeWorkspaceId && !workspaceIds.some((id) => id.toString() === activeWorkspaceId.toString())) {
    user.workspaceIds = [...workspaceIds, activeWorkspaceId];
  }

  if (!activeWorkspaceId && workspaceIds.length > 0) {
    user.workspaceId = workspaceIds[0];
  }

  await ensureWorkspaceForUser(user);

  return user as typeof user & { workspaceId: mongoose.Types.ObjectId; workspaceIds?: mongoose.Types.ObjectId[] };
}

function parseTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function buildUserTaskMatch(user: { _id: mongoose.Types.ObjectId; workspaceId?: mongoose.Types.ObjectId | null }) {
  const base = {
    $or: [
      { workspaceId: user.workspaceId },
      { userId: user._id },
    ],
  };

  if (user.workspaceId) {
    return {
      $and: [
        {
          $or: [
            { workspaceId: user.workspaceId },
            { userId: user._id },
          ],
        },
      ],
    };
  }

  return { userId: user._id };
}

async function resolveAssignee(
  assigneeId: string,
  workspaceId: mongoose.Types.ObjectId
): Promise<mongoose.Types.ObjectId | null> {
  if (!assigneeId) {
    return null;
  }

  if (!mongoose.isValidObjectId(assigneeId)) {
    throw new Error("Invalid assignee");
  }

  const assignee = await User.findOne({ _id: assigneeId });

  if (!assignee) {
    throw new Error("Assignee not found in this workspace");
  }

  const assigneeWorkspaceId = assignee.workspaceId?.toString();
  const assigneeWorkspaceIds = Array.isArray(assignee.workspaceIds)
    ? assignee.workspaceIds.map((id) => id.toString())
    : [];
  const hasWorkspaceMembership =
    assigneeWorkspaceId === workspaceId.toString() ||
    assigneeWorkspaceIds.includes(workspaceId.toString()) ||
    (await Workspace.exists({ _id: workspaceId, members: assignee._id }));

  if (!hasWorkspaceMembership) {
    throw new Error("Assignee not found in this workspace");
  }

  return assignee._id as mongoose.Types.ObjectId;
}

async function getTaskForUser(
  user: { _id: mongoose.Types.ObjectId; workspaceId?: mongoose.Types.ObjectId | null },
  taskId: string
) {
  const task = await Task.findOne({
    _id: taskId,
    workspaceId: user.workspaceId,
  });

  if (!task) {
    throw new Error("Task not found");
  }

  const workspace = await Workspace.findById(user.workspaceId);

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  const isOwner = workspace.ownerId.equals(user._id);
  const isCreator = task.userId.equals(user._id);
  const isAssignee = Boolean(task.assignee && task.assignee.equals(user._id));

  if (!isOwner && !isCreator && !isAssignee) {
    throw new Error("You do not have permission to manage this task");
  }

  return { task, workspace, isOwner, isCreator, isAssignee };
}

export async function createTask(formData: FormData) {
  try {
    const user = await getAuthenticatedUser();

    const title = String(formData.get("title") || "").trim();
    const description = String(formData.get("description") || "").trim();
    const priorityValue = String(formData.get("priority") || "medium");
    const dueDate = String(formData.get("dueDate") || "");
    const assignee = String(formData.get("assignee") || "");
    const tags = parseTags(String(formData.get("tags") || ""));

    if (!title) {
      throw new Error("Task title is required");
    }

    if (!["low", "medium", "high"].includes(priorityValue)) {
      throw new Error("Invalid priority");
    }

    const workspaceId = user.workspaceId;
    const workspace = await Workspace.findById(workspaceId);

    if (!workspace) {
      throw new Error("Workspace not found");
    }

    if (!workspace.ownerId.equals(user._id)) {
      throw new Error("Only the workspace owner can create tasks");
    }

    const assigneeId = await resolveAssignee(assignee, workspaceId);

    await Task.create({
      title,
      description,
      priority: priorityValue as "low" | "medium" | "high",
      status: "todo",
      dueDate: dueDate ? new Date(dueDate) : undefined,
      userId: user._id,
      workspaceId,
      assignee: assigneeId ?? undefined,
      tags,
    });

    revalidatePath(TASKS_PATH);
    revalidatePath("/dashboard");
  } catch (error) {
    console.error("Create task error:", error);
    throw error;
  }
}

export async function updateTask(formData: FormData) {
  try {
    const user = await getAuthenticatedUser();

    const taskId = String(formData.get("taskId") || "");
    const title = String(formData.get("title") || "").trim();
    const description = String(formData.get("description") || "").trim();
    const status = String(formData.get("status") || "todo");
    const priority = String(formData.get("priority") || "medium");
    const dueDate = String(formData.get("dueDate") || "");
    const assignee = String(formData.get("assignee") || "");
    const tags = parseTags(String(formData.get("tags") || ""));

    if (!taskId) {
      throw new Error("Task ID is required");
    }

    if (!title) {
      throw new Error("Task title is required");
    }

    if (!["todo", "in-progress", "done"].includes(status)) {
      throw new Error("Invalid status");
    }

    if (!["low", "medium", "high"].includes(priority)) {
      throw new Error("Invalid priority");
    }

    const { task, workspace } = await getTaskForUser(user, taskId);

    if (!workspace.ownerId.equals(user._id)) {
      throw new Error("Only the workspace owner can update tasks");
    }

    const workspaceId = user.workspaceId;
    const assigneeId = await resolveAssignee(assignee, workspaceId);

    await Task.updateOne(
      {
        _id: task._id,
        workspaceId,
      },
      {
        $set: {
          title,
          description,
          status,
          priority,
          dueDate: dueDate ? new Date(dueDate) : undefined,
          assignee: assigneeId ?? undefined,
          tags,
        },
      }
    );

    revalidatePath(TASKS_PATH);
    revalidatePath("/dashboard");
  } catch (error) {
    console.error("Update task error:", error);
    throw error;
  }
}

export async function deleteTask(formData: FormData) {
  try {
    const user = await getAuthenticatedUser();

    const taskId = String(formData.get("taskId") || "");

    if (!taskId) {
      throw new Error("Task ID is required");
    }

    const { task: deletedTask, workspace } = await getTaskForUser(user, taskId);

    if (!workspace.ownerId.equals(user._id)) {
      throw new Error("Only the workspace owner can delete tasks");
    }

    await Task.deleteOne({ _id: deletedTask._id, workspaceId: user.workspaceId });

    revalidatePath(TASKS_PATH);
    revalidatePath("/dashboard");
  } catch (error) {
    console.error("Delete task error:", error);
    throw error;
  }
}

export async function updateTaskStatus(formData: FormData) {
  try {
    const user = await getAuthenticatedUser();

    const taskId = String(formData.get("taskId") || "");
    const status = String(formData.get("status") || "");

    if (!taskId) {
      throw new Error("Task ID is required");
    }

    if (!["todo", "in-progress", "done"].includes(status)) {
      throw new Error("Invalid status");
    }

    const task = await Task.findOne({
      _id: taskId,
      workspaceId: user.workspaceId,
    });

    if (!task) {
      throw new Error("Task not found");
    }

    const workspace = await Workspace.findById(user.workspaceId);

    if (!workspace) {
      throw new Error("Workspace not found");
    }

    const isOwner = workspace.ownerId.equals(user._id);
    const isAssignee = Boolean(task.assignee && task.assignee.equals(user._id));

    if (!isOwner && !isAssignee) {
      throw new Error("You can only update the status of tasks assigned to you");
    }

    await Task.updateOne(
      {
        _id: task._id,
        workspaceId: user.workspaceId,
      },
      {
        $set: {
          status,
          workspaceId: task.workspaceId || user.workspaceId,
        },
      }
    );

    revalidatePath(TASKS_PATH);
    revalidatePath("/dashboard");
  } catch (error) {
    console.error("Update task status error:", error);
    throw error;
  }
}

export async function createComment(formData: FormData) {
  try {
    const user = await getAuthenticatedUser();

    const taskId = String(formData.get("taskId") || "");
    const content = String(formData.get("content") || "").trim();

    if (!taskId) {
      throw new Error("Task ID is required");
    }

    if (!mongoose.isValidObjectId(taskId)) {
      throw new Error("Invalid task ID");
    }

    if (!content) {
      throw new Error("Comment cannot be empty");
    }

    const task = await Task.findOne({
      _id: taskId,
      workspaceId: user.workspaceId,
    });

    if (!task) {
      throw new Error("Task not found");
    }

    const workspace = await Workspace.findById(user.workspaceId);

    if (!workspace) {
      throw new Error("Workspace not found");
    }

    const isWorkspaceMember = workspace.members.some((memberId) => memberId.equals(user._id));

    if (!isWorkspaceMember && !workspace.ownerId.equals(user._id)) {
      throw new Error("Only workspace members can comment on tasks");
    }

    await Comment.create({
      taskId: task._id,
      authorId: user._id,
      content,
    });

    revalidatePath(TASKS_PATH);
  } catch (error) {
    console.error("Create comment error:", error);
    throw error;
  }
}