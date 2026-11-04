import { lookup } from "node:dns/promises";
import { URL } from "node:url";

export type NetworkGeo = {
  host: string;
  ipAddress: string | null;
  geo: {
    latitude: number;
    longitude: number;
    city?: string | null;
    region?: string | null;
    country?: string | null;
    isp?: string | null;
  } | null;
  geolocationStatus: "resolved" | "unresolved" | "private_ip" | "geo_failed";
};

function isPrivateIp(ip: string) {
  if (ip === "127.0.0.1" || ip === "::1") return true;
  if (ip.startsWith("10.") || ip.startsWith("192.168.")) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)) return true;
  if (ip.startsWith("169.254.")) return true;
  if (ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("fe80:")) return true;
  return false;
}

export function hostnameFromUrl(value: string) {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return null;
  }
}

async function fetchIpGeo(ipAddress: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);

  try {
    const url = `http://ip-api.com/json/${encodeURIComponent(ipAddress)}?fields=status,message,country,regionName,city,lat,lon,isp,query`;
    const response = await fetch(url, { cache: "no-store", signal: controller.signal });
    if (!response.ok) return null;
    const payload = await response.json();
    if (payload.status !== "success" || typeof payload.lat !== "number" || typeof payload.lon !== "number") {
      return null;
    }
    return {
      latitude: payload.lat,
      longitude: payload.lon,
      city: payload.city ?? null,
      region: payload.regionName ?? null,
      country: payload.country ?? null,
      isp: payload.isp ?? null
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function resolveNetworkGeo(sourceUrl: string): Promise<NetworkGeo | null> {
  const host = hostnameFromUrl(sourceUrl);
  if (!host) return null;

  try {
    const result = await lookup(host, { family: 0 });
    const ipAddress = result.address;

    if (isPrivateIp(ipAddress)) {
      return { host, ipAddress, geo: null, geolocationStatus: "private_ip" };
    }

    const geo = await fetchIpGeo(ipAddress);
    return {
      host,
      ipAddress,
      geo,
      geolocationStatus: geo ? "resolved" : "geo_failed"
    };
  } catch {
    return { host, ipAddress: null, geo: null, geolocationStatus: "unresolved" };
  }
}

export async function enrichRawMetaWithNetworkGeo(sourceUrl: string, rawMeta: Record<string, unknown> = {}) {
  const existing = rawMeta.networkGeo as NetworkGeo | undefined;
  if (existing?.geo?.latitude && existing?.geo?.longitude) return rawMeta;

  const networkGeo = await resolveNetworkGeo(sourceUrl);
  if (!networkGeo) return rawMeta;
  return { ...rawMeta, networkGeo };
}
