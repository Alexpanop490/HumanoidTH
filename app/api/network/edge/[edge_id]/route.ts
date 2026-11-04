import { NextResponse } from "next/server";
import { getNetworkEdge, type NetworkSourceMode } from "@/lib/network-graph";

export const dynamic = "force-dynamic";

type Params = Promise<{ edge_id: string }>;

export async function GET(req: Request, { params }: { params: Params }) {
  const { edge_id } = await params;
  const { searchParams } = new URL(req.url);
  const result = await getNetworkEdge(decodeURIComponent(edge_id), {
    sourceMode: (searchParams.get("source") as NetworkSourceMode | null) ?? undefined
  });
  if (!result) {
    return NextResponse.json({ error: "Edge not found" }, { status: 404 });
  }
  return NextResponse.json(result);
}
