import type { Prisma } from "../generated/prisma";

export type SourceMapPoint = {
  id: string;
  title: string;
  url: string;
  platform: string;
  sourceType: string;
  ipAddress: string;
  host: string;
  latitude: number;
  longitude: number;
  locationLabel: string;
  publishedAt: string | null;
};

type SourceRecordLike = {
  id: string;
  title: string;
  url: string;
  platform: string | null;
  sourceType: string;
  rawMeta: Prisma.JsonValue;
  publishedAt: Date | null;
};

function asObject(value: Prisma.JsonValue): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function sourceToMapPoint(source: SourceRecordLike): SourceMapPoint | null {
  const rawMeta = asObject(source.rawMeta);
  const networkGeo = asObject(rawMeta.networkGeo as Prisma.JsonValue);
  const geo = asObject(networkGeo.geo as Prisma.JsonValue);
  const latitude = readNumber(geo.latitude);
  const longitude = readNumber(geo.longitude);
  const ipAddress = typeof networkGeo.ipAddress === "string" ? networkGeo.ipAddress : null;
  const host = typeof networkGeo.host === "string" ? networkGeo.host : null;

  if (latitude === null || longitude === null || !ipAddress || !host) return null;

  const city = typeof geo.city === "string" ? geo.city : "";
  const region = typeof geo.region === "string" ? geo.region : "";
  const country = typeof geo.country === "string" ? geo.country : "";
  const locationLabel = [city, region, country].filter(Boolean).join(", ") || "IP geolocation";

  return {
    id: source.id,
    title: source.title,
    url: source.url,
    platform: source.platform ?? "unknown",
    sourceType: source.sourceType,
    ipAddress,
    host,
    latitude,
    longitude,
    locationLabel,
    publishedAt: source.publishedAt?.toISOString() ?? null
  };
}
