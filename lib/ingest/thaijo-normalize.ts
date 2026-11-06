import type { NormalizedSource } from "@/lib/ingest/types";
import { canonicalizeUrl } from "@/lib/url";

type ThaiJoArticle = {
  id?: unknown;
  titles?: unknown;
  abstracts?: unknown;
  authors?: unknown;
  article_url?: unknown;
  date_published?: unknown;
  year?: unknown;
  doi?: unknown;
  journal_name?: unknown;
  journal_url?: unknown;
  journal_path?: unknown;
  keywords?: unknown;
  languages?: unknown;
  pages?: unknown;
};

function localizedText(value: unknown) {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return "";
  const localized = value as Record<string, unknown>;
  for (const language of ["en_US", "th_TH"]) {
    if (typeof localized[language] === "string" && localized[language]) {
      return localized[language] as string;
    }
  }
  return "";
}

function stripMarkup(value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function articleUrl(value: unknown) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !/(^|\.)tci-thaijo\.org$/i.test(url.hostname)) return null;
    return canonicalizeUrl(url.toString());
  } catch {
    return null;
  }
}

export function normalizeThaiJoArticle(article: ThaiJoArticle): NormalizedSource | null {
  const url = articleUrl(article.article_url);
  const title = stripMarkup(localizedText(article.titles));
  if (!url || !title) return null;

  const excerpt = stripMarkup(localizedText(article.abstracts));
  const publishedAt = typeof article.date_published === "string"
    ? new Date(article.date_published)
    : null;
  const dateYear = typeof article.date_published === "string"
    ? Number(article.date_published.slice(0, 4))
    : null;
  const year = typeof article.year === "number"
    ? article.year
    : dateYear !== null && Number.isInteger(dateYear) && dateYear >= 1900
      ? dateYear
      : null;
  const authors = article.authors && typeof article.authors === "object"
    ? Object.values(article.authors as Record<string, unknown>).find(Array.isArray) as unknown[] | undefined
    : undefined;

  return {
    sourceType: "THAIJO",
    title,
    url,
    excerpt: excerpt.slice(0, 20000),
    publishedAt: publishedAt && !Number.isNaN(publishedAt.getTime()) ? publishedAt : null,
    author: authors?.filter((author): author is string => typeof author === "string").join("; ") || null,
    platform: "ThaiJO",
    rawMeta: {
      thaiJoId: typeof article.id === "string" ? article.id : null,
      year,
      doi: typeof article.doi === "string" ? article.doi : null,
      journal: localizedText(article.journal_name) || null,
      journalUrl: typeof article.journal_url === "string" ? article.journal_url : null,
      journalPath: typeof article.journal_path === "string" ? article.journal_path : null,
      keywords: article.keywords ?? {},
      languages: article.languages ?? [],
      pages: typeof article.pages === "string" ? article.pages : null
    }
  };
}
