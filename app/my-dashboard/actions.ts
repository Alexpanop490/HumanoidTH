"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { dashboardWidgetValues, interestPresets } from "@/lib/user-dashboard-config";

const dashboardInputSchema = z.object({
  id: z.string().cuid().optional(),
  name: z.string().trim().min(1).max(60),
  presetInterests: z.array(z.enum(interestPresets)).max(interestPresets.length),
  customInterests: z.string().max(500),
  widgets: z.array(z.enum(dashboardWidgetValues)).min(1).max(dashboardWidgetValues.length)
});

export async function saveUserDashboard(formData: FormData) {
  const user = await requireUser("/my-dashboard");
  const id = String(formData.get("id") ?? "").trim() || undefined;
  const parsed = dashboardInputSchema.safeParse({
    id,
    name: String(formData.get("name") ?? ""),
    presetInterests: formData.getAll("presetInterests").map(String),
    customInterests: String(formData.get("customInterests") ?? ""),
    widgets: formData.getAll("widgets").map(String)
  });

  if (!parsed.success) throw new Error("Please choose a name and at least one valid dashboard widget.");

  const customInterests = parsed.data.customInterests
    .split(",")
    .map((interest) => interest.trim())
    .filter(Boolean);
  if (customInterests.some((interest) => interest.length > 60)) {
    throw new Error("Each custom interest must be 60 characters or fewer.");
  }

  const interestKeywords = [...new Set([...parsed.data.presetInterests, ...customInterests])];
  if (interestKeywords.length > 12) {
    throw new Error("Choose no more than 12 interests per dashboard.");
  }
  if (parsed.data.id) {
    const updated = await prisma.userDashboard.updateMany({
      where: { id: parsed.data.id, userId: user.id },
      data: {
        name: parsed.data.name,
        interestKeywords,
        widgets: parsed.data.widgets
      }
    });
    if (!updated.count) throw new Error("Dashboard was not found for this account.");
    revalidatePath("/my-dashboard");
    redirect(`/my-dashboard?id=${encodeURIComponent(parsed.data.id)}`);
  }

  const dashboard = await prisma.userDashboard.create({
    data: {
      userId: user.id,
      name: parsed.data.name,
      interestKeywords,
      widgets: parsed.data.widgets
    }
  });
  revalidatePath("/my-dashboard");
  redirect(`/my-dashboard?id=${encodeURIComponent(dashboard.id)}`);
}

export async function deleteUserDashboard(formData: FormData) {
  const user = await requireUser("/my-dashboard");
  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("Dashboard ID is required.");

  await prisma.userDashboard.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/my-dashboard");
  redirect("/my-dashboard");
}
