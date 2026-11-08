import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { compare } from "bcryptjs";
import { createHash, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { isConfiguredAdminEmail } from "@/lib/admin-email";

function matchesAdminPassword(candidate: string, configured: string | undefined) {
  if (!configured || configured.length < 24) return false;
  const candidateHash = createHash("sha256").update(candidate).digest();
  const configuredHash = createHash("sha256").update(configured).digest();
  return timingSafeEqual(candidateHash, configuredHash);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const parsed = z.object({
          email: z.string().email().max(254),
          password: z.string().min(1).max(128)
        }).safeParse(credentials);
        if (!parsed.success) return null;

        const email = parsed.data.email.trim().toLowerCase();
        if (isConfiguredAdminEmail(email)) {
          if (!matchesAdminPassword(parsed.data.password, process.env.ADMIN_PASSWORD)) return null;
          const user = await prisma.user.upsert({
            where: { email },
            update: { role: "ADMIN" },
            create: { email, role: "ADMIN" }
          });
          return { id: user.id, email: user.email, name: user.name, role: "ADMIN" };
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash || !(await compare(parsed.data.password, user.passwordHash))) {
          return null;
        }

        if (user.role !== "USER") {
          await prisma.user.update({ where: { id: user.id }, data: { role: "USER" } });
        }
        return { id: user.id, email: user.email, name: user.name, role: "USER" };
      }
    })
  ],
  session: { strategy: "jwt" },
  trustHost: true,
  pages: { signIn: "/admin-login" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.role = user.role;
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = token.role === "ADMIN" ? "ADMIN" : "USER";
      }
      return session;
    }
  }
});
