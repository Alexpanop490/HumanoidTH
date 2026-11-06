import { cookies } from "next/headers";
import styles from "./decorate.module.css";
import { getTranslation } from "@/lib/translations";
import SynergyTabs from "@/app/components/Synergytabs/synergytabs";
import HriSection from "@/app/hri/HriSection";
import type { HriView } from "@/app/hri/HriDashboard";

export default async function HriPage({ view }: { view: HriView }) {
  const cookieStore = await cookies();
  const lang = (cookieStore.get("lang")?.value || "en") as "en" | "th";
  const t = getTranslation(lang);

  return (
    <div className={styles.container}>
      <SynergyTabs analyticsLabel={t.analytics} synergyLabel={t.synergy} />
      <h1 className={styles.title}>{t.synergy}</h1>
      <HriSection view={view} />
    </div>
  );
}
