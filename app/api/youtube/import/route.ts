import { NextResponse } from "next/server";

export async function POST(request: Request) {
  let payload: { query?: unknown; limit?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const query = typeof payload.query === "string" ? payload.query.trim() : "";
  const limit = Number(payload.limit ?? 10);
  if (!query) {
    return NextResponse.json({ error: "Enter a YouTube search query." }, { status: 400 });
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
    return NextResponse.json({ error: "Limit must be between 1 and 50." }, { status: 400 });
  }

  const baseUrl = (process.env.HUMANOID_ATLAS_API_URL ?? "http://127.0.0.1:8000").replace(/\/+$/, "");
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/youtube/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, limit }),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { error: "Could not reach the Humanoid API. Start it at http://127.0.0.1:8000 or set HUMANOID_ATLAS_API_URL." },
      { status: 502 },
    );
  }

  const body = await response.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Humanoid API returned an invalid response." }, { status: 502 });
  }
  if (!response.ok) {
    const detail = "detail" in body && typeof body.detail === "string" ? body.detail : "YouTube import failed.";
    return NextResponse.json({ error: detail }, { status: response.status });
  }
  return NextResponse.json(body);
}
