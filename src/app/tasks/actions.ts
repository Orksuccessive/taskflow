"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import Task from "@/models/Task";
import mongoose from "mongoose";

const TASKS_PATH = "/tasks";

async function getAuthenticatedUser() {
  const session = await auth();

  if (!session?.user?.email) {
    throw new Error("Unauthorized");
  }

  await connectDB();

  return session.user.email;
}

export async function createTask(formData: FormData) {
  try {
    const email = await getAuthenticatedUser();

    const title = String(formData.get("title") || "").trim();
    const description = String(formData.get("description") || "").trim();
    const priorityValue = String(
      formData.get("priority") || "medium"
    );
    const dueDate = String(formData.get("dueDate") || "");

    if (!title) {
      throw new Error("Task title is required");
    }

    if (!["low", "medium", "high"].includes(priorityValue)) {
      throw new Error("Invalid priority");
    }

    const priority = priorityValue as "low" | "medium" | "high";

    const User = mongoose.model("User");

    const user = await User.findOne({ email });

    if (!user) {
      throw new Error("User not found");
    }

    await Task.create({
      title,
      description,
      priority,
      status: "todo",
      dueDate: dueDate ? new Date(dueDate) : undefined,
      userId: user._id,
    });

    revalidatePath("/tasks");
  } catch (error) {
    console.error("Create task error:", error);
    throw error;
  }
}
export async function updateTask(formData: FormData) {
  try {
    const email = await getAuthenticatedUser();

    const taskId = String(formData.get("taskId") || "");
    const title = String(formData.get("title") || "").trim();
    const description = String(formData.get("description") || "").trim();
    const status = String(formData.get("status") || "todo");
    const priority = String(formData.get("priority") || "medium");
    const dueDate = String(formData.get("dueDate") || "");

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

    const User = mongoose.model("User");

    const user = await User.findOne({ email });

    if (!user) {
      throw new Error("User not found");
    }

    const task = await Task.findOne({
      _id: taskId,
      userId: user._id,
    });

    if (!task) {
      throw new Error("Task not found");
    }

    await Task.updateOne(
      {
        _id: task._id,
        userId: user._id,
      },
      {
        $set: {
          title,
          description,
          status,
          priority,
          dueDate: dueDate ? new Date(dueDate) : undefined,
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
    const email = await getAuthenticatedUser();

    const taskId = String(formData.get("taskId") || "");

    if (!taskId) {
      throw new Error("Task ID is required");
    }

    const User = mongoose.model("User");

    const user = await User.findOne({ email });

    if (!user) {
      throw new Error("User not found");
    }

    const deletedTask = await Task.findOneAndDelete({
      _id: taskId,
      userId: user._id,
    });

    if (!deletedTask) {
      throw new Error("Task not found");
    }

    revalidatePath(TASKS_PATH);
  } catch (error) {
    console.error("Delete task error:", error);
    throw error;
  }
}