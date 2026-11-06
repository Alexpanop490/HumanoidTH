import { prisma } from "@/lib/prisma";
import HriDashboard, { type HriView } from "./HriDashboard";

async function fetchHriAnalyses() {
  return prisma.hriAnalysis.findMany({
    where: { source: { is: { sourceType: "THAIJO", relevanceStatus: { not: "REJECTED" } } } },
    include: {
      source: {
        select: {
          title: true,
          url: true,
          author: true,
          publishedAt: true,
          rawMeta: true
        }
      }
    },
    orderBy: { updatedAt: "desc" },
    take: 1000
  });
}

export default async function HriSection({ view }: { view: HriView }) {
  let dataError: string | null = null;
  let analyses: Awaited<ReturnType<typeof fetchHriAnalyses>> = [];

  try {
    analyses = await fetchHriAnalyses();
  } catch (error) {
    console.error("Could not load healthcare HRI analyses:", error);
    dataError = "HRI data is unavailable. Apply the latest Prisma database migration and try again.";
  }

  const records = analyses.map((analysis) => {
    const rawMeta = analysis.source.rawMeta;
    const year = typeof rawMeta === "object" &&
      rawMeta !== null &&
      "year" in rawMeta &&
      typeof rawMeta.year === "number"
      ? rawMeta.year
      : analysis.source.publishedAt?.getUTCFullYear() ?? null;

    return {
      id: analysis.id,
      title: analysis.source.title,
      url: analysis.source.url,
      author: analysis.source.author,
      year,
      workplaceName: analysis.workplaceName,
      robotName: analysis.robotName,
      careSetting: analysis.careSetting,
      interactionOutcome: analysis.interactionOutcome,
      communicationBarrier: analysis.communicationBarrier,
      barrierStatus: analysis.barrierStatus,
      positiveEmotions: Array.isArray(analysis.positiveEmotions) ? analysis.positiveEmotions : [],
      negativeEmotions: Array.isArray(analysis.negativeEmotions) ? analysis.negativeEmotions : [],
      humanResponse: analysis.humanResponse,
      robotResponse: analysis.robotResponse,
      positiveInteractionCount: analysis.positiveInteractionCount,
      negativeInteractionCount: analysis.negativeInteractionCount,
      metrics: Array.isArray(analysis.metrics) ? analysis.metrics : [],
      evidenceExcerpt: analysis.evidenceExcerpt,
      confidence: analysis.confidence,
      analysisStatus: analysis.analysisStatus,
      analysisMethod: analysis.analysisMethod,
      analysisError: analysis.analysisError
    };
  });

  return <HriDashboard records={records} dataError={dataError} view={view} />;
}
