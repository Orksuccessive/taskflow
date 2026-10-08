"use server";

import mongoose from "mongoose";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import { canTransitionStatus, TASK_STATUSES } from "@/lib/taskStatus";
import Comment from "@/models/Comment";
import Task from "@/models/Task";
import User from "@/models/User";
import Workspace from "@/models/Workspace";

const TASKS_PATH = "/tasks";
type TaskStatus = (typeof TASK_STATUSES)[number];

function createInviteCode() {
  return Array.from({ length: 8 }, () =>
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[
      Math.floor(Math.random() * 32)
    ]
  ).join("");
}

async function getAuthenticatedUser() {
  const session = await auth();

  if (!session?.user?.email) {
    throw new Error("Unauthorized");
  }

  await connectDB();

  const user = await User.findOne({ email: session.user.email });

  if (!user) {
    throw new Error("User not found");
  }

  if (!user.workspaceId) {
    const workspace = await Workspace.create({
      name: user.name ? `${user.name}'s workspace` : "My workspace",
      inviteCode: createInviteCode(),
      ownerId: user._id,
      members: [user._id],
    });

    const existingWorkspaceIds = Array.isArray(user.workspaceIds) ? user.workspaceIds : [];
    const workspaceIds = existingWorkspaceIds.some((id) => id.toString() === workspace._id.toString())
      ? existingWorkspaceIds
      : [...existingWorkspaceIds, workspace._id];

    user.workspaceIds = workspaceIds;
    user.workspaceId = workspace._id;
    await user.save();
  }

  return user;
}

export async function createTask(formData: FormData) {
  try {
    const user = await getAuthenticatedUser();

    const title = String(formData.get("title") || "").trim();
    const description = String(formData.get("description") || "").trim();
    const priorityValue = String(formData.get("priority") || "medium");
    const dueDate = String(formData.get("dueDate") || "").trim();
    const assignee = String(formData.get("assignee") || "");
    const tagsValue = String(formData.get("tags") || "");
    const tags = tagsValue
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    if (!title) {
      throw new Error("Task title is required");
    }

    if (!dueDate) {
      throw new Error("Due date is required");
    }

    if (!["low", "medium", "high"].includes(priorityValue)) {
      throw new Error("Invalid priority");
    }

    const workspace = await Workspace.findById(user.workspaceId);

    if (!workspace) {
      throw new Error("Workspace not found");
    }

    if (workspace.ownerId.toString() !== user._id.toString()) {
      throw new Error("Only the workspace owner can create tasks");
    }

    const priority = priorityValue as "low" | "medium" | "high";
    let assigneeId: mongoose.Types.ObjectId | undefined;

    if (assignee) {
      if (!mongoose.isValidObjectId(assignee)) {
        throw new Error("Invalid assignee");
      }

      const assigneeUser = await User.findById(assignee);

      if (!assigneeUser) {
        throw new Error("Assignee not found");
      }

      const isMember = workspace.members.some((memberId) => memberId.toString() === assigneeUser._id.toString());

      if (!isMember) {
        throw new Error("Assignee not found in this workspace");
      }

      assigneeId = assigneeUser._id;
    }

    await Task.create({
      title,
      description,
      priority,
      status: "todo",
      dueDate: dueDate ? new Date(dueDate) : undefined,
      userId: user._id,
      workspaceId: workspace._id,
      assignee: assigneeId,
      tags,
    });

    revalidatePath(TASKS_PATH);
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
    const dueDate = String(formData.get("dueDate") || "").trim();
    const assignee = String(formData.get("assignee") || "");
    const tagsValue = String(formData.get("tags") || "");
    const tags = tagsValue
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    if (!taskId) {
      throw new Error("Task ID is required");
    }

    if (!title) {
      throw new Error("Task title is required");
    }

    if (!dueDate) {
      throw new Error("Due date is required");
    }

    if (!TASK_STATUSES.includes(status as TaskStatus)) {
      throw new Error("Invalid status");
    }

    if (!["low", "medium", "high"].includes(priority)) {
      throw new Error("Invalid priority");
    }

    const workspace = await Workspace.findById(user.workspaceId);

    if (!workspace) {
      throw new Error("Workspace not found");
    }

    const task = await Task.findOne({
      _id: taskId,
      workspaceId: workspace._id,
    });

    if (!task) {
      throw new Error("Task not found");
    }

    const isOwner = workspace.ownerId.toString() === user._id.toString();
    const isAssignee = task.assignee?.toString() === user._id.toString();

    if (!isOwner && !isAssignee) {
      throw new Error("You can only edit tasks assigned to you or owned by the workspace owner");
    }

    const isStatusChange = task.status !== status;
    if (isStatusChange && !canTransitionStatus(task.status, status)) {
      throw new Error("Tasks must move through the workflow step by step");
    }

    let assigneeId: mongoose.Types.ObjectId | null = null;

    if (assignee) {
      if (!mongoose.isValidObjectId(assignee)) {
        throw new Error("Invalid assignee");
      }

      const assigneeUser = await User.findById(assignee);

      if (!assigneeUser) {
        throw new Error("Assignee not found");
      }

      const isMember = workspace.members.some((memberId) => memberId.toString() === assigneeUser._id.toString());

      if (!isMember) {
        throw new Error("Assignee not found in this workspace");
      }

      assigneeId = assigneeUser._id;
    }

    await Task.updateOne(
      {
        _id: task._id,
        workspaceId: workspace._id,
      },
      {
        $set: {
          title,
          description,
          status,
          priority,
          dueDate: dueDate ? new Date(dueDate) : undefined,
          assignee: assigneeId,
          tags,
          workspaceId: workspace._id,
        },
      }
    );

    revalidatePath(TASKS_PATH);
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

    const task = await Task.findOne({
      _id: taskId,
      workspaceId: user.workspaceId,
    });

    if (!task) {
      throw new Error("Task not found");
    }

    await Task.deleteOne({ _id: task._id, workspaceId: user.workspaceId });
    await Comment.deleteMany({ taskId: task._id });

    revalidatePath(TASKS_PATH);
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

    if (!TASK_STATUSES.includes(status as TaskStatus)) {
      throw new Error("Invalid status");
    }

    const task = await Task.findOne({
      _id: taskId,
      workspaceId: user.workspaceId,
    });

    if (!task) {
      throw new Error("Task not found");
    }

    const isOwner = user._id.toString() === task.userId?.toString();
    const isAssignedMember = task.assignee?.toString() === user._id.toString();

    if (!isOwner && !isAssignedMember) {
      throw new Error("You can only update the status of tasks assigned to you or owned by the workspace owner");
    }

    const isStatusChange = task.status !== status;
    if (isStatusChange && !canTransitionStatus(task.status, status)) {
      throw new Error("Tasks must move through the workflow step by step");
    }

    await Task.updateOne(
      {
        _id: task._id,
        workspaceId: user.workspaceId,
      },
      {
        $set: {
          status,
          workspaceId: user.workspaceId,
        },
      }
    );

    revalidatePath(TASKS_PATH);
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

export async function deleteComment(formData: FormData) {
  try {
    const user = await getAuthenticatedUser();

    const commentId = String(formData.get("commentId") || "").trim();

    if (!commentId || !mongoose.isValidObjectId(commentId)) {
      throw new Error("Invalid comment ID");
    }

    const comment = await Comment.findById(commentId);

    if (!comment) {
      throw new Error("Comment not found");
    }

    const task = await Task.findById(comment.taskId);

    if (!task) {
      throw new Error("Task not found");
    }

    const workspace = await Workspace.findById(task.workspaceId);

    if (!workspace) {
      throw new Error("Workspace not found");
    }

    const isOwner = workspace.ownerId.toString() === user._id.toString();
    const isCommentAuthor = comment.authorId.toString() === user._id.toString();

    if (!isOwner && !isCommentAuthor) {
      throw new Error("You can only delete your own comment or workspace comments you own");
    }

    await Comment.deleteOne({ _id: comment._id });

    revalidatePath(TASKS_PATH);
  } catch (error) {
    console.error("Delete comment error:", error);
    throw error;
  }
}
