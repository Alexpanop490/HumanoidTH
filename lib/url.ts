const TRACKING_PARAMS = ["fbclid", "gclid", "igshid", "mc_cid", "mc_eid"];

export function canonicalizeUrl(input: string) {
  const raw = input.trim();

  try {
    const url = new URL(raw);
    if (!["http:", "https:"].includes(url.protocol)) {
      return raw;
    }

    url.hash = "";
    for (const key of Array.from(url.searchParams.keys())) {
      if (key.toLowerCase().startsWith("utm_") || TRACKING_PARAMS.includes(key.toLowerCase())) {
        url.searchParams.delete(key);
      }
    }

    url.hostname = url.hostname.toLowerCase();
    if (url.pathname !== "/" && url.pathname.endsWith("/")) {
      url.pathname = url.pathname.slice(0, -1);
    }

    return url.toString();
  } catch {
    return raw;
  }
}
