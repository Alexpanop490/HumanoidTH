import { NextResponse } from "next/server";

type AssistantRecord = {
  title?: unknown;
  organization?: unknown;
  organizationType?: unknown;
  status?: unknown;
  location?: unknown;
  useCase?: unknown;
  author?: unknown;
  journal?: unknown;
  year?: unknown;
  excerpt?: unknown;
  keywords?: unknown;
  sourceTitle?: unknown;
};

function cleanText(value: unknown, limit = 180) {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

export async function POST(request: Request) {
  let parsedBody: unknown;
  try {
    parsedBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (!parsedBody || typeof parsedBody !== "object" || Array.isArray(parsedBody)) {
    return NextResponse.json({ error: "Request body must be a JSON object." }, { status: 400 });
  }
  const body = parsedBody as { action?: unknown; question?: unknown; contextType?: unknown; records?: unknown };

  const action = body.action === "summary" ? "summary" : body.action === "ask" ? "ask" : null;
  if (!action) {
    return NextResponse.json({ error: "Choose either a summary or a question." }, { status: 400 });
  }

  const question = cleanText(body.question, 500);
  if (action === "ask" && !question) {
    return NextResponse.json({ error: "Enter a question about the visible records." }, { status: 400 });
  }

  if (body.contextType !== "deployments" && body.contextType !== "thaijo") {
    return NextResponse.json({ error: "Choose deployment records or ThaiJO research records." }, { status: 400 });
  }

  if (!Array.isArray(body.records) || body.records.length > 100) {
    return NextResponse.json({ error: "The selected records are invalid or too large. Refresh the page and try again." }, { status: 400 });
  }

  const records = (body.records as AssistantRecord[]).slice(0, 100).map((item) => ({
    title: cleanText(item?.title),
    organization: cleanText(item?.organization),
    organizationType: cleanText(item?.organizationType, 80),
    status: cleanText(item?.status),
    location: cleanText(item?.location, 120),
    useCase: cleanText(item?.useCase),
    author: cleanText(item?.author),
    journal: cleanText(item?.journal),
    year: typeof item?.year === "number" && Number.isFinite(item.year) ? item.year : null,
    abstractOrExcerpt: cleanText(item?.excerpt, 500),
    keywords: Array.isArray(item?.keywords)
      ? item.keywords.filter((keyword): keyword is string => typeof keyword === "string").slice(0, 15).map((keyword) => cleanText(keyword, 80))
      : [],
    citedSource: cleanText(item?.sourceTitle)
  }));
  if (records.every((record) => !record.title)) {
    return NextResponse.json({ error: "There are no usable records to summarize or ask about." }, { status: 400 });
  }
  const baseUrl = (process.env.OLLAMA_BASE_URL || "http://localhost:11434").replace(/\/+$/, "");
  let model = process.env.OLLAMA_MODEL?.trim();
  if (!model) {
    try {
      const tagsResponse = await fetch(`${baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(5000),
        cache: "no-store"
      });
      if (!tagsResponse.ok) {
        return NextResponse.json({ error: "Could not list local Ollama models. Check that Ollama is running." }, { status: 502 });
      }

      const tags = await tagsResponse.json() as { models?: Array<{ name?: string; size?: number }> };
      model = tags.models
        ?.filter((item) => typeof item.name === "string" && item.name)
        .sort((a, b) => (a.size ?? Number.MAX_SAFE_INTEGER) - (b.size ?? Number.MAX_SAFE_INTEGER))[0]
        ?.name;
      if (!model) {
        return NextResponse.json({ error: "Ollama is running, but no local model is installed. Pull a model or set OLLAMA_MODEL." }, { status: 503 });
      }
    } catch (error) {
      console.error("Could not list local Ollama models:", error);
      return NextResponse.json({ error: "Could not reach Ollama. Confirm it is running and try again." }, { status: 502 });
    }
  }

  const datasetLabel = body.contextType === "thaijo" ? "ThaiJO academic research records" : "robotics deployment records";
  const prompt = action === "summary"
    ? [
        `Summarize these ${datasetLabel} in 3-5 concise sentences.`,
        "Use only facts present in the records. State when status or evidence is missing.",
        "For ThaiJO records, distinguish research publication from real-world deployment; do not claim a paper proves a robot is deployed.",
        "Do not infer that a record is independently verified or currently active.",
        JSON.stringify(records)
      ].join("\n\n")
    : [
        `Answer the question about these ${datasetLabel} using only the supplied records.`,
        "If the answer is not present, say that the selected records do not provide enough information.",
        "Do not make up organizations, robot models, research findings, deployments, dates, locations, or citations.",
        "For ThaiJO records, do not treat research publication as proof of deployment.",
        `Question: ${question}`,
        `Records: ${JSON.stringify(records)}`
      ].join("\n\n");

  try {
    const response = await fetch(`${baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        think: false,
        options: { num_predict: 128, temperature: 0.2 }
      }),
      signal: AbortSignal.timeout(120_000),
      cache: "no-store"
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Ollama deployment assistant returned ${response.status}: ${errorBody.slice(0, 500)}`);
      const errorMessage = /out of memory|failed to allocate/i.test(errorBody)
        ? "Ollama ran out of memory while starting its model. Set OLLAMA_MODEL to a smaller installed model or free system memory."
        : "Ollama could not answer right now. Check the local model server and try again.";
      return NextResponse.json({ error: errorMessage }, { status: 502 });
    }

    const payload: { response?: unknown } = await response.json();
    const answer = cleanText(payload.response, 4000);
    if (!answer) {
      return NextResponse.json({ error: "Ollama returned an empty answer. Please try again." }, { status: 502 });
    }

    return NextResponse.json({ answer });
  } catch (error) {
    console.error("Deployment assistant request failed:", error);
    return NextResponse.json({ error: "Could not reach Ollama. Confirm it is running and try again." }, { status: 502 });
  }
}
