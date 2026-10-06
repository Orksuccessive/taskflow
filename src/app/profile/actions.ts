"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

export async function updateProfile(formData: FormData) {
  const session = await auth();

  if (!session?.user?.email) {
    throw new Error("Unauthorized");
  }

  await connectDB();

  const name = String(formData.get("name") || "").trim();
  const avatarUrl = String(formData.get("avatarUrl") || "").trim();

  if (!name) {
    throw new Error("Name is required");
  }

  const user = await User.findOne({ email: session.user.email });

  if (!user) {
    throw new Error("User not found");
  }

  user.name = name;
  user.avatarUrl = avatarUrl || user.avatarUrl || "";

  await user.save();

  revalidatePath("/profile");
  revalidatePath("/dashboard");
}
