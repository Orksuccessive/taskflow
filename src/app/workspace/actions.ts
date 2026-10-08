"use server";

import mongoose from "mongoose";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import Comment from "@/models/Comment";
import Task from "@/models/Task";
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
  const requestAlreadyPending = workspace.pendingMembers.some((memberId) => memberId.equals(user._id));

  if (memberExists) {
    throw new Error("You are already a member of this workspace");
  }

  if (requestAlreadyPending) {
    throw new Error("Your join request is already pending approval");
  }

  workspace.pendingMembers.push(user._id);
  await workspace.save();

  revalidatePath("/workspace");
  revalidatePath("/dashboard");
  revalidatePath("/profile");

  const workspaceName = encodeURIComponent(workspace.name || "workspace");
  redirect(`/workspace?joinStatus=pending&workspaceName=${workspaceName}`);
}

export async function approveWorkspaceJoin(formData: FormData) {
  const session = await auth();

  if (!session?.user?.email) {
    throw new Error("Unauthorized");
  }

  await connectDB();

  const currentUser = await User.findOne({ email: session.user.email });

  if (!currentUser) {
    throw new Error("User not found");
  }

  const workspaceId = String(formData.get("workspaceId") || currentUser.workspaceId || "").trim();
  const memberId = String(formData.get("memberId") || "").trim();

  if (!workspaceId || !mongoose.isValidObjectId(workspaceId)) {
    throw new Error("Invalid workspace id");
  }

  if (!memberId || !mongoose.isValidObjectId(memberId)) {
    throw new Error("Invalid member id");
  }

  const workspace = await Workspace.findById(workspaceId);

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  if (workspace.ownerId.toString() !== currentUser._id.toString()) {
    throw new Error("Only the workspace owner can approve join requests");
  }

  const requestIndex = workspace.pendingMembers.findIndex((id) => id.toString() === memberId);

  if (requestIndex === -1) {
    throw new Error("This member does not have a pending request");
  }

  const member = await User.findById(memberId);

  if (!member) {
    throw new Error("Member not found");
  }

  workspace.pendingMembers.splice(requestIndex, 1);

  const isAlreadyMember = workspace.members.some((id) => id.toString() === memberId);
  if (!isAlreadyMember) {
    workspace.members.push(new mongoose.Types.ObjectId(memberId));
  }

  await workspace.save();

  const existingWorkspaceIds = Array.isArray(member.workspaceIds) ? member.workspaceIds : [];
  const workspaceIds = existingWorkspaceIds.some((id) => id.toString() === workspace._id.toString())
    ? existingWorkspaceIds
    : [...existingWorkspaceIds, workspace._id];

  member.workspaceIds = workspaceIds;
  if (!member.workspaceId) {
    member.workspaceId = workspace._id;
  }

  await member.save();

  revalidatePath("/workspace");
  revalidatePath("/dashboard");
  revalidatePath("/profile");
  revalidatePath("/tasks");
}

export async function rejectWorkspaceJoin(formData: FormData) {
  const session = await auth();

  if (!session?.user?.email) {
    throw new Error("Unauthorized");
  }

  await connectDB();

  const currentUser = await User.findOne({ email: session.user.email });

  if (!currentUser) {
    throw new Error("User not found");
  }

  const workspaceId = String(formData.get("workspaceId") || currentUser.workspaceId || "").trim();
  const memberId = String(formData.get("memberId") || "").trim();

  if (!workspaceId || !mongoose.isValidObjectId(workspaceId)) {
    throw new Error("Invalid workspace id");
  }

  if (!memberId || !mongoose.isValidObjectId(memberId)) {
    throw new Error("Invalid member id");
  }

  const workspace = await Workspace.findById(workspaceId);

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  if (workspace.ownerId.toString() !== currentUser._id.toString()) {
    throw new Error("Only the workspace owner can manage join requests");
  }

  workspace.pendingMembers = workspace.pendingMembers.filter((id) => id.toString() !== memberId);
  await workspace.save();

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

export async function deleteWorkspace(formData: FormData) {
  const session = await auth();

  if (!session?.user?.email) {
    throw new Error("Unauthorized");
  }

  await connectDB();

  const user = await User.findOne({ email: session.user.email });

  if (!user) {
    throw new Error("User not found");
  }

  const workspaceId = String(formData.get("workspaceId") || user.workspaceId || "").trim();

  if (!workspaceId || !mongoose.isValidObjectId(workspaceId)) {
    throw new Error("Invalid workspace id");
  }

  const workspace = await Workspace.findById(workspaceId);

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  if (workspace.ownerId.toString() !== user._id.toString()) {
    throw new Error("Only the workspace owner can delete this workspace");
  }

  const taskIds = await Task.find({ workspaceId: workspace._id }, "_id").lean();
  const taskObjectIds = taskIds.map((task) => task._id);

  if (taskObjectIds.length) {
    await Comment.deleteMany({ taskId: { $in: taskObjectIds } });
  }

  await Task.deleteMany({ workspaceId: workspace._id });

  const memberIds = workspace.members.map((memberId) => memberId.toString());

  if (memberIds.length) {
    const members = await User.find({ _id: { $in: memberIds } });

    for (const member of members) {
      if (member._id.toString() === user._id.toString()) {
        continue;
      }

      const remainingWorkspaceIds = (member.workspaceIds || []).filter(
        (id) => id.toString() !== workspace._id.toString()
      );

      member.workspaceIds = remainingWorkspaceIds;

      if (member.workspaceId && member.workspaceId.toString() === workspace._id.toString()) {
        member.workspaceId = remainingWorkspaceIds[0] || null;
      }

      await member.save();
    }
  }

  await Workspace.deleteOne({ _id: workspace._id });

  if (user.workspaceId && user.workspaceId.toString() === workspace._id.toString()) {
    const nextWorkspaceId = (user.workspaceIds || []).find((id) => id.toString() !== workspace._id.toString());
    user.workspaceId = nextWorkspaceId || null;
    user.workspaceIds = (user.workspaceIds || []).filter((id) => id.toString() !== workspace._id.toString());
    await user.save();
  }

  revalidatePath("/workspace");
  revalidatePath("/dashboard");
  revalidatePath("/profile");
  revalidatePath("/tasks");
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
  const actualWorkspace = await Workspace.findById(workspaceId).select("members").lean();
  const hasAccess = workspaceIds.some((id) => id.toString() === workspaceId)
    || user.workspaceId?.toString() === workspaceId
    || !!actualWorkspace?.members?.some((memberId) => memberId.toString() === user._id.toString());

  if (!hasAccess) {
    throw new Error("You do not have access to this workspace");
  }

  const normalizedWorkspaceIds = workspaceIds.some((id) => id.toString() === workspaceId)
    ? workspaceIds
    : [...workspaceIds, new mongoose.Types.ObjectId(workspaceId)];

  user.workspaceIds = normalizedWorkspaceIds;
  user.workspaceId = new mongoose.Types.ObjectId(workspaceId);
  await user.save();

  revalidatePath("/workspace");
  revalidatePath("/dashboard");
  revalidatePath("/profile");
  revalidatePath("/tasks");
}

