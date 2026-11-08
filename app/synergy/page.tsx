import type { Metadata } from "next";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import SynergyTabs from "@/app/components/Synergytabs/synergytabs";
import SynergyTrack, { type PerspectiveRecord, type ThaiJoRecord } from "./SynergyTrack";
import styles from "./decorate.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Synergy Track | Thailand Humanoid Atlas",
  description: "Explore public perspectives, ThaiJO medical research, and evidence-based insights across Thailand."
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function textValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function countValues(values: string[]) {
  return values.reduce<Record<string, number>>((counts, value) => {
    const key = value.trim().toLowerCase() || "unclear";
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

async function summarizeWithOllama(perspectives: PerspectiveRecord[]) {
  const model = process.env.OLLAMA_MODEL;
  if (!model || !perspectives.length) return null;

  const baseUrl = (process.env.OLLAMA_BASE_URL || "http://localhost:11434").replace(/\/+$/, "");
  const counts = {
    records: perspectives.length,
    sentiment: countValues(perspectives.map((item) => item.sentiment)),
    responses: countValues(perspectives.map((item) => item.stance)),
    themes: countValues(perspectives.map((item) => item.theme))
  };

  try {
    const response = await fetch(`${baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        prompt: [
          "Write a concise evidence summary (2-3 sentences) for a robotics research dashboard.",
          "Use only the aggregate counts supplied below. Do not invent causes, quote people, or imply statistical significance.",
          "Mention the main positive/negative balance and the most frequent theme only when counts support it.",
          JSON.stringify(counts)
        ].join("\n\n")
      }),
      signal: AbortSignal.timeout(8000),
      cache: "no-store"
    });
    if (!response.ok) {
      console.error(`Local Ollama summary request failed: ${response.status}`);
      return null;
    }

    const payload: { response?: string } = await response.json();
    const summary = payload.response?.trim();
    return summary ? summary.slice(0, 1200) : null;
  } catch (error) {
    console.error("Local Ollama summary request failed:", error);
    return null;
  }
}

export default async function Synergy() {
  const cookieStore = await cookies();
  const lang = (cookieStore.get("lang")?.value || "en") as "en" | "th";

  let perspectives: PerspectiveRecord[] = [];
  let thaiJoRecords: ThaiJoRecord[] = [];
  let aiSummary: string | null = null;
  let thaiJoLoadFailed = false;
  let dbOffline = false;

  try {
    const annotations = await prisma.perspectiveAnnotation.findMany({
      select: {
        id: true,
        stance: true,
        sentiment: true,
        perspectiveTheme: true,
        targetEntity: true,
        evidenceExcerpt: true,
        confidence: true,
        createdAt: true,
        source: { select: { title: true, url: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 5000
    });

    perspectives = annotations.map((item) => ({
      id: item.id,
      stance: item.stance,
      sentiment: item.sentiment,
      theme: item.perspectiveTheme,
      target: item.targetEntity,
      evidence: item.evidenceExcerpt,
      confidence: item.confidence,
      createdAt: item.createdAt.toISOString(),
      sourceTitle: item.source.title,
      sourceUrl: item.source.url
    }));
    aiSummary = await summarizeWithOllama(perspectives);

    let thaiJoSources: Array<{
      id: string;
      title: string;
      author: string | null;
      excerpt: string;
      url: string;
      publishedAt: Date | null;
      rawMeta: unknown;
    }> = [];
    try {
      thaiJoSources = await prisma.$queryRaw<typeof thaiJoSources>`
        SELECT "id", "title", "author", "excerpt", "url", "publishedAt", "rawMeta"
        FROM "SourceRecord"
        WHERE "sourceType"::text = 'THAIJO'
        ORDER BY "publishedAt" DESC NULLS LAST, "updatedAt" DESC
        LIMIT 1000
      `;
    } catch (error) {
      console.error("Failed to load ThaiJO records for Synergy Track:", error);
      thaiJoLoadFailed = true;
    }

    thaiJoRecords = thaiJoSources.map((source) => {
      const meta = asRecord(source.rawMeta);
      const year = typeof meta?.year === "number" ? meta.year : source.publishedAt?.getFullYear() ?? null;
      const rawKeywords = meta?.keywords;
      const keywords = Array.isArray(rawKeywords)
        ? rawKeywords.filter((value): value is string => typeof value === "string")
        : typeof rawKeywords === "string" ? rawKeywords.split(",").map((value) => value.trim()).filter(Boolean) : [];

      return {
        id: source.id,
        title: source.title,
        author: source.author,
        journal: textValue(meta?.journalName),
        publishedAt: source.publishedAt?.toISOString() ?? null,
        excerpt: source.excerpt,
        url: source.url,
        year,
        keywords,
        searchText: textValue(meta?.searchText) ?? ""
      };
    });

  } catch (error) {
    console.error("Failed to load Synergy Track live data:", error);
    dbOffline = true;
    perspectives = [];
    thaiJoRecords = [];
  }

  return (
    <div className={styles.container}>
      <SynergyTabs />
      <header className={styles.pageHeader}>
        <div>
          <span className={styles.eyebrow}>THAILAND HUMANOID ATLAS / FIELD INTELLIGENCE</span>
          <h1 className={styles.title}>Synergy Track</h1>
          <p className={styles.subtitle}>
            A connected view of public perspectives, ThaiJO medical research, and evidence-led insights.
          </p>
        </div>
        <span className={styles.liveBadge}><span /> Live atlas data</span>
      </header>
      {dbOffline && (
        <div className={styles.notice} role="status">
          The live database is unavailable right now. Charts and ThaiJO research records are not being replaced with sample data.
        </div>
      )}
      {thaiJoLoadFailed && !dbOffline && (
        <div className={styles.notice} role="status">
          ThaiJO records could not be loaded. Check that the database is reachable and the THAIJO source-type migration has been applied.
        </div>
      )}
      <SynergyTrack
        perspectives={perspectives}
        thaiJoRecords={thaiJoRecords}
        language={lang}
        aiSummary={aiSummary}
      />
    </div>
  );
}
