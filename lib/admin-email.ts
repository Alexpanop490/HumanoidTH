const adminEmails = new Set(
  (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
);

export function isConfiguredAdminEmail(email: string | null | undefined) {
  return Boolean(email && adminEmails.has(email.trim().toLowerCase()));
}
