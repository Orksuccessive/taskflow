"use server";

import mongoose from "mongoose";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Workspace from "@/models/Workspace";

function createInviteCode() {
  return Array.from({ length: 8 }, () =>
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[
      Math.floor(Math.random() * 32)
    ]
  ).join("");
}

export async function createWorkspace(formData: FormData) {
  const session = await auth();

  if (!session?.user?.email) {
    throw new Error("Unauthorized");
  }

  await connectDB();

  const user = await User.findOne({ email: session.user.email });

  if (!user) {
    throw new Error("User not found");
  }

  const workspaceName = String(formData.get("workspaceName") || "").trim();

  if (!workspaceName) {
    throw new Error("Workspace name is required");
  }

  const inviteCode = createInviteCode();

  const workspace = await Workspace.create({
    name: workspaceName,
    inviteCode,
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

  revalidatePath("/workspace");
  revalidatePath("/dashboard");
  revalidatePath("/profile");
}

export async function joinWorkspace(formData: FormData) {
  const session = await auth();

  if (!session?.user?.email) {
    throw new Error("Unauthorized");
  }

  await connectDB();

  const user = await User.findOne({ email: session.user.email });

  if (!user) {
    throw new Error("User not found");
  }

  const inviteCode = String(formData.get("inviteCode") || "").trim().toUpperCase();

  if (!inviteCode) {
    throw new Error("Invite code is required");
  }

  const workspace = await Workspace.findOne({ inviteCode });

  if (!workspace) {
    throw new Error("Invite code not found");
  }

  const memberExists = workspace.members.some((memberId) => memberId.equals(user._id));

  if (!memberExists) {
    workspace.members.push(user._id);
    await workspace.save();
  }

  const existingWorkspaceIds = Array.isArray(user.workspaceIds) ? user.workspaceIds : [];
  const workspaceIds = existingWorkspaceIds.some((id) => id.toString() === workspace._id.toString())
    ? existingWorkspaceIds
    : [...existingWorkspaceIds, workspace._id];

  user.workspaceIds = workspaceIds;
  user.workspaceId = workspace._id;
  await user.save();

  revalidatePath("/workspace");
  revalidatePath("/dashboard");
  revalidatePath("/profile");
}

export async function leaveWorkspace() {
  const session = await auth();

  if (!session?.user?.email) {
    throw new Error("Unauthorized");
  }

  await connectDB();

  const user = await User.findOne({ email: session.user.email });

  if (!user || !user.workspaceId) {
    throw new Error("You are not in a workspace");
  }

  const workspace = await Workspace.findById(user.workspaceId);

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  if (workspace.ownerId.equals(user._id)) {
    throw new Error("Workspace owner cannot leave the workspace");
  }

  workspace.members = workspace.members.filter((memberId) => !memberId.equals(user._id));
  await workspace.save();

  user.workspaceIds = (user.workspaceIds || []).filter(
    (workspaceId) => workspaceId.toString() !== user.workspaceId?.toString()
  );
  user.workspaceId = user.workspaceIds[0] || null;
  await user.save();

  revalidatePath("/workspace");
  revalidatePath("/dashboard");
  revalidatePath("/profile");
}

export async function removeMember(formData: FormData) {
  const session = await auth();

  if (!session?.user?.email) {
    throw new Error("Unauthorized");
  }

  await connectDB();

  const currentUser = await User.findOne({ email: session.user.email });

  if (!currentUser || !currentUser.workspaceId) {
    throw new Error("You are not in a workspace");
  }

  const workspace = await Workspace.findById(currentUser.workspaceId);

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  if (!workspace.ownerId.equals(currentUser._id)) {
    throw new Error("Only the workspace owner can remove members");
  }

  const memberId = String(formData.get("memberId") || "").trim();

  if (!memberId || !memberId.match(/^[a-fA-F0-9]{24}$/)) {
    throw new Error("Invalid member id");
  }

  if (workspace.ownerId.toString() === memberId) {
    throw new Error("The workspace owner cannot be removed");
  }

  workspace.members = workspace.members.filter((member) => !member.equals(memberId));
  await workspace.save();

  await User.updateOne(
    { _id: memberId },
    {
      $set: {
        workspaceId: null,
        workspaceIds: [],
      },
    }
  );

  revalidatePath("/workspace");
  revalidatePath("/dashboard");
  revalidatePath("/profile");
}

export async function switchWorkspace(formData: FormData) {
  const session = await auth();

  if (!session?.user?.email) {
    throw new Error("Unauthorized");
  }

  await connectDB();

  const workspaceId = String(formData.get("workspaceId") || "").trim();

  if (!workspaceId || !mongoose.isValidObjectId(workspaceId)) {
    throw new Error("Invalid workspace id");
  }

  const user = await User.findOne({ email: session.user.email });

  if (!user) {
    throw new Error("User not found");
  }

  const workspaceIds = Array.isArray(user.workspaceIds) ? user.workspaceIds : [];
  const hasAccess = workspaceIds.some((id) => id.toString() === workspaceId) || user.workspaceId?.toString() === workspaceId;

  if (!hasAccess) {
    throw new Error("You do not have access to this workspace");
  }

  user.workspaceId = new mongoose.Types.ObjectId(workspaceId);
  await user.save();

  revalidatePath("/workspace");
  revalidatePath("/dashboard");
  revalidatePath("/profile");
}

