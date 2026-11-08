"use client";

import Link from "next/link";
import { LogIn, LogOut, UserRound } from "lucide-react";
import { signOut } from "next-auth/react";

type AuthNavigationProps = {
  user: { name: string | null; email: string; role: string } | null;
  compact?: boolean;
};

export default function AuthNavigation({ user, compact = false }: AuthNavigationProps) {
  if (!user) {
    return (
      <Link
        className={compact ? "auth-navigation-link compact" : "auth-navigation-link"}
        href="/admin-login?from=%2Fmy-dashboard"
      >
        <LogIn size={compact ? 19 : 17} aria-hidden="true" />
        <span>{compact ? "Sign in" : "Sign in to save dashboards"}</span>
      </Link>
    );
  }

  return (
    <div className={compact ? "auth-navigation signed-in compact" : "auth-navigation signed-in"}>
      <Link className="auth-navigation-link" href="/profile" title={user.email}>
        <UserRound size={compact ? 19 : 17} aria-hidden="true" />
        <span>{compact ? "Account" : user.name || user.email}</span>
      </Link>
      {!compact && (
        <span className="auth-navigation-role">
          {user.role === "ADMIN" ? "Administrator" : "Signed in"}
        </span>
      )}
      <button
        type="button"
        className="auth-navigation-signout"
        aria-label="Sign out"
        onClick={() => signOut({ redirectTo: "/profile" })}
      >
        <LogOut size={15} aria-hidden="true" />
        <span>{compact ? "Sign out" : "Sign out"}</span>
      </button>
    </div>
  );
}
