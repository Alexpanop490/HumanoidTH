"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";

export function SignInLink({ callbackUrl = "/profile" }: { callbackUrl?: string }) {
  return (
    <Link className="button primary" href={`/admin-login?from=${encodeURIComponent(callbackUrl)}`}>
      Sign in
    </Link>
  );
}

export function SignOutButton() {
  return (
    <button type="button" onClick={() => signOut({ redirectTo: "/profile" })}>
      Sign out
    </button>
  );
}
