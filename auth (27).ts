"use server";

import { z } from "zod";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSession, destroySession, hashPassword, requireUser, verifyPassword } from "../auth";
import { prisma } from "../prisma";
import { resolveImage } from "../uploads";
import type { ActionState } from "./types";

const registerSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3, "Username must be at least 3 characters.")
      .max(20, "Username must be 20 characters or fewer.")
      .regex(/^[A-Za-z0-9_]+$/, "Username can use letters, numbers, and underscores."),
    email: z.string().trim().email("Enter a valid email address.").max(120),
    password: z.string().min(8, "Password must be at least 8 characters.").max(72),
    confirm: z.string(),
  })
  .refine((value) => value.password === value.confirm, {
    message: "Passwords do not match.",
    path: ["confirm"],
  });

export async function register(_prev: ActionState, form: FormData): Promise<ActionState> {
  const parsed = registerSchema.safeParse({
    username: form.get("username"),
    email: form.get("email"),
    password: form.get("password"),
    confirm: form.get("confirm"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  const username = parsed.data.username.toLowerCase();
  const email = parsed.data.email.toLowerCase();
  try {
    const user = await prisma.user.create({
      data: {
        username,
        email,
        displayName: parsed.data.username,
        passwordHash: await hashPassword(parsed.data.password),
      },
    });
    await createSession(user.id, true);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const target = String(error.meta?.target ?? "");
      if (target.includes("email")) return { error: "That email is already registered." };
      return { error: "That username is already taken." };
    }
    throw error;
  }
  redirect("/home");
}

const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Enter your email or username."),
  password: z.string().min(1, "Enter your password."),
});

export async function login(_prev: ActionState, form: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    identifier: form.get("identifier"),
    password: form.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Enter your account details." };
  const identifier = parsed.data.identifier;
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: identifier.toLowerCase() }, { username: identifier.toLowerCase() }],
    },
  });
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return { error: "Those account details do not match." };
  }
  await createSession(user.id, form.get("remember") === "on");
  redirect("/home");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

export async function updateProfile(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const displayName = String(form.get("displayName") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (displayName.length < 2 || displayName.length > 32) return { error: "Display name must be 2–32 characters." };
  if (!z.string().email().safeParse(email).success) return { error: "Enter a valid email address." };
  const image = await resolveImage(form, "avatar", "avatarUrl", "removeAvatar", "avatars", 2 * 1024 * 1024);
  if (image.error) return { error: image.error };
  try {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        displayName,
        email,
        ...(image.url !== undefined ? { avatarUrl: image.url } : {}),
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "That email is already in use." };
    }
    throw error;
  }
  revalidatePath("/profile");
  revalidatePath("/home");
  return { success: "Profile saved." };
}

export async function changePassword(_prev: ActionState, form: FormData): Promise<ActionState> {
  const sessionUser = await requireUser();
  const current = String(form.get("current") ?? "");
  const next = String(form.get("next") ?? "");
  const confirm = String(form.get("confirm") ?? "");
  if (next.length < 8) return { error: "New password must be at least 8 characters." };
  if (next !== confirm) return { error: "New passwords do not match." };
  const user = await prisma.user.findUnique({ where: { id: sessionUser.id } });
  if (!user || !(await verifyPassword(current, user.passwordHash))) return { error: "Current password is incorrect." };
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(next) } });
  return { success: "Password updated." };
}
