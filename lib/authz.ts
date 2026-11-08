import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { isConfiguredAdminEmail } from "@/lib/admin-email";

export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id }
  });
  if (user?.role === "ADMIN" && !isConfiguredAdminEmail(user.email)) {
    return { ...user, role: "USER" as const };
  }
  return user;
}

export async function requireUser(returnTo = "/profile") {
  const user = await getCurrentUser();
  if (!user) redirect(`/admin-login?from=${encodeURIComponent(returnTo)}`);
  return user;
}

export async function requireAdmin(returnTo = "/admin") {
  const user = await requireUser(returnTo);
  if (user.role !== "ADMIN") redirect("/profile");
  return user;
}
