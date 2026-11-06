"use client";

import styles from "./synergy.module.css";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface SynergyTabsProps {
    analyticsLabel: string;
    synergyLabel: string;
}

export default function SynergyTabs({ analyticsLabel, synergyLabel }: SynergyTabsProps) {
    const pathname = usePathname() || "";
    return (
        <div className={styles.tabs}>
            <Link
                href="/analytics"
                className={`${styles.tab} ${pathname === "/analytics" ? styles.active : ""}`}
            >
                {analyticsLabel}
            </Link>
            <Link
                href="/synergy"
                className={`${styles.tab} ${pathname.startsWith("/synergy") ? styles.active : ""}`}
            >
                {synergyLabel}
            </Link>
        </div>
    );
}