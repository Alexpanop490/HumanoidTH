import { loadEnvFile } from "node:process";
import { evaluateClassification } from "../lib/hri-metrics";
import { classifyThaiJoHriWithOllama } from "../lib/hri-analysis";
import { hriClassificationBenchmark } from "../test/fixtures/hri-classification-benchmark";

loadEnvFile(".env");

const relevancePredictions: string[] = [];
const outcomePredictions: string[] = [];

for (const example of hriClassificationBenchmark) {
  const result = await classifyThaiJoHriWithOllama(example.title, example.abstract);
  relevancePredictions.push(String(result.isHriRelevant));
  outcomePredictions.push(result.interactionOutcome);
  console.log(`${example.id}: relevance=${result.isHriRelevant}, outcome=${result.interactionOutcome}`);
}

const relevanceReport = evaluateClassification(
  hriClassificationBenchmark.map((example) => String(example.expected.isHriRelevant)),
  relevancePredictions,
  ["true", "false"]
);
const outcomeReport = evaluateClassification(
  hriClassificationBenchmark.map((example) => example.expected.interactionOutcome),
  outcomePredictions,
  ["positive", "negative", "mixed", "neutral", "unclear"]
);

console.log("\nRelevance metrics");
console.log(JSON.stringify(relevanceReport, null, 2));
console.log("\nInteraction outcome metrics");
console.log(JSON.stringify(outcomeReport, null, 2));
