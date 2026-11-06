import { z } from "zod";
import { Prisma } from "../../generated/prisma";
import { prisma } from "@/lib/prisma";
import type { IngestResult, NormalizedSource } from "@/lib/ingest/types";
import { classifyThaiJoHriWithGemini } from "@/lib/hri-analysis";
import { normalizeThaiJoArticle } from "@/lib/ingest/thaijo-normalize";

const responseSchema = z.object({
  hits: z.array(z.record(z.string(), z.unknown())).default([])
});

type ThaiJoInput = {
  query: string;
  limit?: number;
  fromYear?: number;
  toYear?: number;
};

async function saveThaiJoArticles(records: NormalizedSource[]) {
  let saved = 0;
  let failed = 0;
  const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY);

  for (const record of records) {
    const rawMeta = (record.rawMeta ?? {}) as Prisma.InputJsonValue;
    const source = await prisma.sourceRecord.upsert({
      where: { url: record.url },
      create: {
        sourceType: "THAIJO",
        title: record.title,
        url: record.url,
        excerpt: record.excerpt ?? "",
        publishedAt: record.publishedAt ?? null,
        author: record.author ?? null,
        platform: "ThaiJO",
        rawMeta,
        relevanceStatus: "PENDING",
        relevanceReason: "Imported from ThaiJO; awaiting evidence-based HRI analysis."
      },
      update: {
        title: record.title,
        excerpt: record.excerpt ?? "",
        publishedAt: record.publishedAt ?? null,
        author: record.author ?? null,
        platform: "ThaiJO",
        rawMeta
      }
    });

    if (!hasGeminiKey) {
      await prisma.hriAnalysis.upsert({
        where: { sourceId: source.id },
        create: { sourceId: source.id, analysisMethod: "gemini_key_missing" },
        update: {}
      });
      saved += 1;
      continue;
    }

    try {
      const analysis = await classifyThaiJoHriWithGemini(record.title, record.excerpt ?? "");
      const analyzedAt = new Date();
      const status = analysis.isHriRelevant ? "ACCEPTED" : "REJECTED";

      await prisma.$transaction([
        prisma.sourceRecord.update({
          where: { id: source.id },
          data: {
            relevanceStatus: status,
            relevanceReason: analysis.relevanceReason,
            relevanceConfidence: analysis.relevanceConfidence
          }
        }),
        prisma.hriAnalysis.upsert({
          where: { sourceId: source.id },
          create: {
            sourceId: source.id,
            workplaceName: analysis.workplaceName,
            robotName: analysis.robotName,
            careSetting: analysis.careSetting,
            interactionOutcome: analysis.interactionOutcome,
            communicationBarrier: analysis.communicationBarrier,
            barrierStatus: analysis.barrierStatus,
            positiveEmotions: analysis.positiveEmotions,
            negativeEmotions: analysis.negativeEmotions,
            humanResponse: analysis.humanResponse,
            robotResponse: analysis.robotResponse,
            positiveInteractionCount: analysis.positiveInteractionCount,
            negativeInteractionCount: analysis.negativeInteractionCount,
            metrics: analysis.metrics as Prisma.InputJsonValue,
            evidenceExcerpt: analysis.evidenceExcerpt,
            confidence: analysis.confidence,
            analysisStatus: "ANALYZED",
            analysisMethod: analysis.model,
            analyzedAt
          },
          update: {
            workplaceName: analysis.workplaceName,
            robotName: analysis.robotName,
            careSetting: analysis.careSetting,
            interactionOutcome: analysis.interactionOutcome,
            communicationBarrier: analysis.communicationBarrier,
            barrierStatus: analysis.barrierStatus,
            positiveEmotions: analysis.positiveEmotions,
            negativeEmotions: analysis.negativeEmotions,
            humanResponse: analysis.humanResponse,
            robotResponse: analysis.robotResponse,
            positiveInteractionCount: analysis.positiveInteractionCount,
            negativeInteractionCount: analysis.negativeInteractionCount,
            metrics: analysis.metrics as Prisma.InputJsonValue,
            evidenceExcerpt: analysis.evidenceExcerpt,
            confidence: analysis.confidence,
            analysisStatus: "ANALYZED",
            analysisMethod: analysis.model,
            analysisError: null,
            analyzedAt
          }
        })
      ]);
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message.slice(0, 1000) : "Unknown Gemini analysis error";
      console.error(`ThaiJO HRI analysis failed for ${record.url}:`, error);
      await prisma.hriAnalysis.upsert({
        where: { sourceId: source.id },
        create: {
          sourceId: source.id,
          analysisStatus: "FAILED",
          analysisMethod: "gemini",
          analysisError: message
        },
        update: {
          workplaceName: null,
          robotName: null,
          careSetting: null,
          interactionOutcome: "unclear",
          communicationBarrier: "unclear",
          barrierStatus: "unclear",
          positiveEmotions: [],
          negativeEmotions: [],
          humanResponse: "unclear",
          robotResponse: "unclear",
          positiveInteractionCount: null,
          negativeInteractionCount: null,
          metrics: [],
          evidenceExcerpt: "",
          confidence: 0,
          analysisStatus: "FAILED",
          analysisMethod: "gemini",
          analysisError: message,
          analyzedAt: null
        }
      });
    }
    saved += 1;
  }

  return { saved, failed };
}

export async function ingestThaiJo({ query, limit = 25, fromYear, toYear }: ThaiJoInput): Promise<IngestResult> {
  const normalizedQuery = query.trim().slice(0, 255);
  if (!normalizedQuery) throw new Error("A ThaiJO search query is required.");

  const safeLimit = Math.max(1, Math.min(Math.trunc(limit) || 25, 100));
  const startYear = Number.isInteger(fromYear) ? fromYear : undefined;
  const endYear = Number.isInteger(toYear) ? toYear : undefined;
  const currentYear = new Date().getFullYear();
  if ((startYear !== undefined && (startYear < 1900 || startYear > currentYear)) ||
      (endYear !== undefined && (endYear < 1900 || endYear > currentYear)) ||
      (startYear !== undefined && endYear !== undefined && startYear > endYear)) {
    throw new Error("ThaiJO year range is invalid.");
  }
  const pageSize = Math.min(50, safeLimit);
  const records = new Map<string, NormalizedSource>();
  const endpoint = "https://www.tci-thaijo.org/api/v1/articles/search";
  let page = 1;
  let reachedStartYear = false;

  while (records.size < safeLimit && page <= 20 && !reachedStartYear) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        q: normalizedQuery,
        page,
        per_page: pageSize,
        sort: "date_desc",
        highlight: false,
        facets: false
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(20000)
    });
    if (!response.ok) {
      throw new Error(`ThaiJO article search failed with HTTP ${response.status}.`);
    }

    const payload = responseSchema.safeParse(await response.json());
    if (!payload.success) {
      throw new Error("ThaiJO returned an invalid article-search response.");
    }
    if (!payload.data.hits.length) break;

    for (const hit of payload.data.hits) {
      const record = normalizeThaiJoArticle(hit);
      if (!record) continue;

      const metaYear = record.rawMeta?.year;
      const year = typeof metaYear === "number"
        ? metaYear
        : record.publishedAt?.getUTCFullYear() ?? null;
      if (year !== null && startYear !== undefined && year < startYear) {
        reachedStartYear = true;
        break;
      }
      if (year !== null && endYear !== undefined && year > endYear) continue;
      if (startYear !== undefined && year === null) continue;
      records.set(record.url, record);
      if (records.size >= safeLimit) break;
    }
    page += 1;
  }

  const items = [...records.values()];
  const result = await saveThaiJoArticles(items);
  const missingKeys = process.env.GEMINI_API_KEY ? [] : ["GEMINI_API_KEY"];
  const warnings = result.failed
    ? [`Gemini analysis failed for ${result.failed} article(s); source records were saved for retry.`]
    : [];

  return {
    adapter: "THAIJO",
    query: normalizedQuery,
    recordsFound: items.length,
    recordsSaved: result.saved,
    missingKeys,
    warnings
  };
}
