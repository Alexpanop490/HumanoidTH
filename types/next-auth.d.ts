import type { DefaultSession } from "next-auth";
import type { UserRole } from "../generated/prisma";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
    } & NonNullable<DefaultSession["user"]>;
  }

  interface User {
    role: UserRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: UserRole;
  }
}
