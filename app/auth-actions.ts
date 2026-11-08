"use server";

import { hash } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isConfiguredAdminEmail } from "@/lib/admin-email";

const registrationSchema = z.object({
  email: z.string().trim().email().max(254),
  name: z.string().trim().max(100).optional(),
  password: z.string().min(12).max(128)
});

export async function registerWithPassword(formData: FormData): Promise<{ error?: string }> {
  const parsed = registrationSchema.safeParse({
    email: String(formData.get("email") ?? "").toLowerCase(),
    name: String(formData.get("name") ?? ""),
    password: String(formData.get("password") ?? "")
  });
  if (!parsed.success) {
    return { error: "Enter a valid email and a password with at least 12 characters." };
  }

  const email = parsed.data.email;
  if (isConfiguredAdminEmail(email)) {
    return { error: "Administrator accounts use the password configured by the site owner and cannot be self-registered." };
  }

  const passwordHash = await hash(parsed.data.password, 12);
  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      passwordHash: true,
      role: true,
      name: true,
      _count: { select: { submissions: true } }
    }
  });
  if (existingUser?.passwordHash) {
    return { error: "An account already exists for this email. Sign in instead." };
  }
  if (existingUser?.role === "ADMIN" || (existingUser && existingUser._count.submissions > 0)) {
    return { error: "This email is already linked to account data. Contact the site administrator to recover access." };
  }

  try {
    if (existingUser) {
      await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          name: parsed.data.name || existingUser.name,
          passwordHash,
          role: "USER"
        }
      });
    } else {
      await prisma.user.create({
        data: {
          email,
          name: parsed.data.name || null,
          passwordHash,
          role: "USER"
        }
      });
    }
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return { error: "An account already exists for this email. Sign in instead." };
    }
    throw error;
  }

  return {};
}
