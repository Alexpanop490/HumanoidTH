import type { SourceType } from "../../generated/prisma";

export type NormalizedSource = {
  sourceType: SourceType;
  title: string;
  url: string;
  excerpt?: string;
  publishedAt?: Date | null;
  author?: string | null;
  platform?: string | null;
  rawMeta?: Record<string, unknown>;
};

export type IngestResult = {
  adapter: SourceType;
  query: string;
  recordsFound: number;
  recordsSaved: number;
  missingKeys?: string[];
};
