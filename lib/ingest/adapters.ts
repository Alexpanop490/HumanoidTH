import { Prisma, type SourceType } from "../../generated/prisma";
import type { IngestResult, NormalizedSource } from "@/lib/ingest/types";
import { saveSources } from "@/lib/ingest/save";
import { prisma } from "@/lib/prisma";
import { hasThaiJoPsychologicalKeyword, isThaiJoTopicMatch } from "@/lib/thaijo-relevance";

type AdapterInput = {
  query: string;
  limit?: number;
  days?: number;
  fromYear?: number;
};

async function finish(adapter: SourceType, query: string, records: NormalizedSource[], missingKeys: string[] = []): Promise<IngestResult> {
  return {
    adapter,
    query,
    recordsFound: records.length,
    recordsSaved: records.length ? await saveSources(records) : 0,
    missingKeys
  };
}

export async function ingestOpenAlex({ query, limit = 25, fromYear = 2015 }: AdapterInput) {
  const url = new URL("https://api.openalex.org/works");
  url.searchParams.set("search", query);
  url.searchParams.set("filter", `from_publication_date:${fromYear}-01-01`);
  url.searchParams.set("per-page", String(Math.min(limit, 50)));

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`OpenAlex ${response.status}`);
  const payload = await response.json();

  const records: NormalizedSource[] = (payload.results ?? []).map((work: any) => ({
    sourceType: "OPENALEX",
    title: work.display_name ?? "Untitled OpenAlex work",
    url: work.doi ?? work.id,
    excerpt: work.abstract_inverted_index ? "OpenAlex abstract metadata available." : "",
    publishedAt: work.publication_year ? new Date(`${work.publication_year}-01-01`) : null,
    platform: "openalex",
    rawMeta: { openalexId: work.id, query }
  }));

  return finish("OPENALEX", query, records);
}

export async function ingestGithub({ query, limit = 25 }: AdapterInput) {
  const url = new URL("https://api.github.com/search/repositories");
  url.searchParams.set("q", query);
  url.searchParams.set("per_page", String(Math.min(limit, 100)));

  const headers: HeadersInit = { Accept: "application/vnd.github+json" };
  const token = process.env.GITHUB_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(url, { headers, cache: "no-store" });
  if (!response.ok) throw new Error(`GitHub ${response.status}`);
  const payload = await response.json();

  const records: NormalizedSource[] = (payload.items ?? []).map((repo: any) => ({
    sourceType: "GITHUB",
    title: repo.full_name,
    url: repo.html_url,
    excerpt: repo.description ?? "",
    author: repo.owner?.login ?? null,
    platform: "github",
    rawMeta: { stars: repo.stargazers_count, language: repo.language, query }
  }));

  return finish("GITHUB", query, records, token ? [] : ["GITHUB_TOKEN optional"]);
}

export async function ingestGdelt({ query, limit = 25, days = 30 }: AdapterInput) {
  const url = new URL("https://api.gdeltproject.org/api/v2/doc/doc");
  url.searchParams.set("query", query);
  url.searchParams.set("mode", "artlist");
  url.searchParams.set("format", "json");
  url.searchParams.set("maxrecords", String(Math.min(limit, 250)));
  url.searchParams.set("timespan", `${days}d`);

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`GDELT ${response.status}`);
  const payload = await response.json();

  const records: NormalizedSource[] = (payload.articles ?? []).map((article: any) => ({
    sourceType: "GDELT",
    title: article.title ?? "Untitled GDELT article",
    url: article.url,
    excerpt: article.snippet ?? "",
    publishedAt: article.seendate ? new Date(article.seendate) : null,
    platform: article.domain ?? "gdelt",
    rawMeta: { query, source: article }
  }));

  return finish("GDELT", query, records);
}

export async function ingestYoutube({ query, limit = 25 }: AdapterInput) {
  const searchQuery = /\bhumanoid\s+robots?\b/i.test(query) ? query : `${query.trim()} humanoid robot`.trim();
  const analysisLimit = Number.isFinite(limit) ? Math.max(1, Math.min(Math.trunc(limit), 3)) : 3;
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) {
    return finish("YOUTUBE", searchQuery, [], ["YOUTUBE_API_KEY"]);
  }

  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("q", searchQuery);
  url.searchParams.set("type", "video");
  url.searchParams.set("maxResults", String(analysisLimit));
  url.searchParams.set("key", key);

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`YouTube ${response.status}`);
  const payload: { items?: Array<{ id?: { videoId?: string }; snippet?: { title?: string; description?: string; channelTitle?: string; publishedAt?: string } }> } = await response.json();
  const videos = (payload.items ?? []).flatMap((item) => {
    const videoId = item.id?.videoId;
    if (!videoId) return [];
    return [{
      video_id: videoId,
      title: item.snippet?.title ?? "Untitled YouTube video",
      description: item.snippet?.description ?? "",
      channel_title: item.snippet?.channelTitle ?? null,
      published_at: item.snippet?.publishedAt ?? null
    }];
  });
  if (!videos.length) return finish("YOUTUBE", searchQuery, []);

  const apiUrl = (process.env.HUMANOID_ATLAS_API_URL ?? "http://127.0.0.1:8000").replace(/\/+$/, "");
  const analysisResponse = await fetch(`${apiUrl}/api/youtube/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ videos }),
    cache: "no-store",
    signal: AbortSignal.timeout(600_000)
  });
  const analysisPayload = await analysisResponse.json().catch(() => null) as {
    detail?: string;
    videos?: Array<{
      video_id: string;
      title: string;
      description?: string;
      url: string;
      channel_title?: string | null;
      published_at?: string | null;
      summary: string;
      robots_detected: string[];
      humanoid_robot_detected: boolean;
      actions_observed: string[];
      setting?: string | null;
      events?: unknown[];
      evidence?: string[];
      confidence: number;
      analysis_model: string;
      duration_seconds: number;
    }>
  } | null;
  if (!analysisResponse.ok || !analysisPayload?.videos) {
    const reason = analysisPayload?.detail || `HTTP ${analysisResponse.status}`;
    throw new Error(`YouTube video analysis failed: ${reason}. Check the Humanoid API and Ollama service.`);
  }

  const records: NormalizedSource[] = analysisPayload.videos.map((video) => ({
    sourceType: "YOUTUBE",
    title: video.title,
    url: video.url,
    excerpt: [video.summary, video.actions_observed.length ? `Observed actions: ${video.actions_observed.join(", ")}.` : ""].filter(Boolean).join(" "),
    publishedAt: video.published_at ? new Date(video.published_at) : null,
    author: video.channel_title ?? null,
    platform: "youtube",
    rawMeta: {
      query: searchQuery,
      videoId: video.video_id,
      durationSeconds: video.duration_seconds,
      humanoidAnalysis: video,
      canonicalName: video.robots_detected[0] ?? ""
    }
  }));

  const recordsSaved = records.length ? await saveSources(records) : 0;
  for (const video of analysisPayload.videos) {
    if (!video.humanoid_robot_detected) continue;
    const names = video.robots_detected.length ? video.robots_detected : ["Humanoid robot (YouTube observation)"];
    for (const rawName of names) {
      const canonicalName = rawName.trim().replace(/\s+/g, " ").slice(0, 120);
      if (!canonicalName) continue;

      const existing = await prisma.robotModel.findFirst({
        where: { canonicalName: { equals: canonicalName, mode: "insensitive" } }
      });
      const analysisJson = JSON.parse(JSON.stringify(video)) as Prisma.InputJsonValue;
      const sourceMeta = {
        ...(existing?.sourceMeta && typeof existing.sourceMeta === "object" && !Array.isArray(existing.sourceMeta) ? existing.sourceMeta : {}),
        title: video.title,
        videoId: video.video_id,
        thumbnailUrl: `https://i.ytimg.com/vi/${encodeURIComponent(video.video_id)}/hqdefault.jpg`,
        humanoidAnalysis: analysisJson,
        needsHumanReview: true
      } as Prisma.InputJsonValue;
      const robotData = {
        description: `${video.summary} Visual identification from a YouTube video; expert review is pending.`,
        robotType: "humanoid",
        thailandStatus: "observed_in_video",
        statusConfidence: Math.max(0, Math.min(video.confidence, 1)),
        officialUrl: video.url,
        sourceMeta,
        lastVerifiedAt: new Date(),
        firstSeenYear: video.published_at ? new Date(video.published_at).getFullYear() : null
      };

      if (existing) {
        await prisma.robotModel.update({ where: { id: existing.id }, data: { ...robotData, sourceMeta } });
      } else {
        await prisma.robotModel.create({
          data: {
            canonicalName,
            primaryUseCase: video.actions_observed.join(", ") || "Video-observed humanoid robot; needs expert review",
            ...robotData
          }
        });
      }
    }
  }

  return {
    adapter: "YOUTUBE" as const,
    query: searchQuery,
    recordsFound: records.length,
    recordsSaved,
    recordsAnalyzed: analysisPayload.videos.length,
    confirmedHumanoidVideos: analysisPayload.videos.filter((video) => video.humanoid_robot_detected).length,
    missingKeys: []
  };
}

type ThaiJoArticle = {
  article_url?: string;
  authors?: Record<string, string[]>;
  abstracts?: Record<string, string | string[]>;
  date_published?: string | null;
  doi?: string | null;
  id?: string;
  journal_name?: Record<string, string>;
  journal_path?: string;
  keywords?: Record<string, string[]>;
  titles?: Record<string, string>;
  year?: number;
};

function firstLocalizedText(values?: Record<string, string | string[]>) {
  if (!values) return "";
  const preferred = values.en_US ?? values.th_TH ?? Object.values(values)[0];
  return Array.isArray(preferred) ? preferred.join(", ") : preferred ?? "";
}

function allLocalizedTexts(values?: Record<string, string | string[]>) {
  if (!values) return [];
  return Object.values(values)
    .flatMap((value) => Array.isArray(value) ? value : [value])
    .map((value) => value.trim())
    .filter(Boolean);
}

export async function ingestThaiJo({ query, limit = 25 }: AdapterInput) {
  const perPage = Number.isFinite(limit) ? Math.max(1, Math.min(Math.trunc(limit), 50)) : 25;
  const response = await fetch("https://www.tci-thaijo.org/api/v1/articles/search", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      q: query,
      page: 1,
      per_page: perPage,
      sort: "date_desc",
      highlight: false,
      facets: false
    }),
    cache: "no-store"
  });
  if (!response.ok) throw new Error(`ThaiJO ${response.status}`);
  const payload: { hits?: ThaiJoArticle[] } = await response.json();

  const records: NormalizedSource[] = (payload.hits ?? []).flatMap((article) => {
    const title = firstLocalizedText(article.titles);
    if (!article.article_url || !title) return [];

    const journalName = firstLocalizedText(article.journal_name);
    const localizedKeywords = allLocalizedTexts(article.keywords);
    const keywords = localizedKeywords.join(", ");
    const localizedTitles = allLocalizedTexts(article.titles);
    const localizedAbstracts = allLocalizedTexts(article.abstracts);
    if (!isThaiJoTopicMatch([...localizedTitles, ...localizedAbstracts, ...localizedKeywords].join(" "))) return [];
    if (!hasThaiJoPsychologicalKeyword(keywords)) return [];

    const excerpt = firstLocalizedText(article.abstracts);
    const publishedAt = article.date_published ? new Date(article.date_published) : null;

    return [{
      sourceType: "THAIJO",
      title,
      url: article.article_url,
      excerpt: excerpt || keywords || journalName,
      publishedAt: publishedAt && !Number.isNaN(publishedAt.getTime()) ? publishedAt : null,
      author: firstLocalizedText(article.authors) || null,
      platform: "thaijo",
      rawMeta: {
        query,
        thaiJoId: article.id,
        doi: article.doi,
        journalName,
        journalPath: article.journal_path,
        keywords,
        searchText: [...localizedTitles, ...localizedAbstracts, ...localizedKeywords].join(" "),
        year: article.year
      }
    }];
  });

  return finish("THAIJO", query, records);
}

export async function runAdapter(adapter: SourceType, input: AdapterInput) {
  switch (adapter) {
    case "OPENALEX":
      return ingestOpenAlex(input);
    case "GITHUB":
      return ingestGithub(input);
    case "GDELT":
      return ingestGdelt(input);
    case "YOUTUBE":
      return ingestYoutube(input);
    case "THAIJO":
      return ingestThaiJo(input);
    default:
      throw new Error(`Adapter ${adapter} is not implemented for API pulling yet.`);
  }
}
