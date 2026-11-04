import Link from "next/link";
import { cookies, headers } from "next/headers";
import styles from "./synergy.module.css";
import { getTranslation } from "@/lib/translations";

export default async function SynergyTabs() {
  const cookieStore = await cookies();
  const lang = (cookieStore.get("lang")?.value || "en") as "en" | "th";
  const t = getTranslation(lang);

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
