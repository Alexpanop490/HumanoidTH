import { NextResponse } from "next/server";
import type { SourceType } from "../../../../generated/prisma";
import { runAdapter } from "@/lib/ingest/adapters";

type Params = Promise<{ adapter: string }>;

export async function POST(request: Request, { params }: { params: Params }) {
  const { adapter: adapterParam } = await params;
  const body = await request.json().catch(() => ({}));
  const adapter = adapterParam.toUpperCase() as SourceType;
  const query = String(body.query ?? "");
  const limit = Number(body.limit ?? 10);
  const fromYear = body.fromYear === undefined ? undefined : Number(body.fromYear);
  const toYear = body.toYear === undefined ? undefined : Number(body.toYear);

  if (!query) {
    return NextResponse.json({ error: "query is required" }, { status: 400 });
  }
  if ((fromYear !== undefined && !Number.isInteger(fromYear)) || (toYear !== undefined && !Number.isInteger(toYear))) {
    return NextResponse.json({ error: "fromYear and toYear must be whole years" }, { status: 400 });
  }

  try {
    const result = await runAdapter(adapter, { query, limit, fromYear, toYear });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown ingestion error" }, { status: 500 });
  }
}
