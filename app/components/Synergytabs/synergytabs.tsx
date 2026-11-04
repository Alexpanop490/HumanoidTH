<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 530f334 (update ui synergy fix)
import styles from "./synergy.module.css";
import { getTranslation } from "@/lib/translations";
import Link from "next/link";
import { cookies, headers } from "next/headers";

export default async function SynergyTabs() {
<<<<<<< HEAD
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
=======
  const cookieStore = await cookies();
  const lang = (cookieStore.get("lang")?.value || "en") as "en" | "th";
  const t = getTranslation(lang);

  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || "";

>>>>>>> 530f334 (update ui synergy fix)
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
>>>>>>> bfc6eae (this is a update)
