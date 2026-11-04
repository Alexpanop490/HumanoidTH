<<<<<<< HEAD
import styles from "./synergy.module.css";
import { getTranslation } from "@/lib/translations";
import Link from "next/link";
import { cookies, headers } from "next/headers";

export default async function SynergyTabs() {
    const cookieStore = await cookies();
    const lang = (cookieStore.get("lang")?.value || "en") as "en" | "th";
    const t = getTranslation(lang);

    // Get the current path from server headers (requires middleware)
    const headersList = await headers();
    const pathname = headersList.get("x-pathname") || "";

    return (
        <div className={styles.tabs}>
            <Link
                href="/analytics"
                className={`${styles.tab} ${pathname === "/analytics" ? styles.active : ""}`}
            >
                {t.analytics}
            </Link>
            <Link
                href="/synergy"
                className={`${styles.tab} ${pathname === "/synergy" ? styles.active : ""}`}
            >
                {t.synergy}
            </Link>
        </div>
    );
}
=======
export default function SynergyTabs() {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
      <button type="button" style={{ padding: "8px 12px", borderRadius: 999, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-primary)" }}>
        Overview
      </button>
      <button type="button" style={{ padding: "8px 12px", borderRadius: 999, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-primary)" }}>
        Human-AI Alignment
      </button>
      <button type="button" style={{ padding: "8px 12px", borderRadius: 999, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-primary)" }}>
        Robotics Signals
      </button>
    </div>
  );
}
>>>>>>> bfc6eae (this is a update)
