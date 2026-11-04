import { NextResponse } from "next/server";
import { getNetworkNode, type NetworkSourceMode } from "@/lib/network-graph";

export const dynamic = "force-dynamic";

type Params = Promise<{ node_id: string }>;

export async function GET(req: Request, { params }: { params: Params }) {
  const { node_id } = await params;
  const { searchParams } = new URL(req.url);
  const result = await getNetworkNode(decodeURIComponent(node_id), {
    sourceMode: (searchParams.get("source") as NetworkSourceMode | null) ?? undefined
  });
  if (!result) {
    return NextResponse.json({ error: "Node not found" }, { status: 404 });
  }
  return NextResponse.json(result);
}
