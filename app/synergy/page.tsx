<<<<<<< HEAD
import { cookies } from "next/dist/server/request/cookies";
import styles from "./decorate.module.css";
import { getTranslation } from "@/lib/translations";
import SynergyTabs from "/app/components/Synergytabs/synergytabs";
=======
import { cookies } from "next/headers";
import styles from "./decorate.module.css";
import { getTranslation } from "@/lib/translations";
import SynergyTabs from "@/app/components/Synergytabs/synergytabs";
>>>>>>> bfc6eae (this is a update)


const Synergy = async () => {
    const cookieStore = await cookies();
    const lang = (cookieStore.get("lang")?.value || "en") as "en" | "th";
    const t = getTranslation(lang);

    return (
        <div className={styles.container}>
            <SynergyTabs />
            <h1 className={styles.title}>{t.synergy}</h1>
        </div>
    )
}

export default Synergy;