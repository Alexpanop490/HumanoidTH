import { loadEnvFile } from "node:process";
import type { SourceType } from "../generated/prisma";

loadEnvFile(".env");

const adapterArg = process.argv[2]?.toUpperCase() as SourceType | undefined;
const query = process.argv.slice(3).join(" ") || "humanoid robot Thailand";

if (!adapterArg) {
  console.error("Usage: pnpm ingest:openalex -- \"humanoid robot Thailand\"");
  process.exit(1);
}

const { runAdapter } = await import("../lib/ingest/adapters");
const result = await runAdapter(adapterArg, { query, limit: 10 });
console.log(JSON.stringify(result, null, 2));
