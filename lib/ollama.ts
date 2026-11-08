import { ChatOllama } from "@langchain/ollama";

export function getOllamaModelName() {
  return process.env.OLLAMA_MODEL?.trim() || "llama3.1";
}

export function createOllamaChatModel(options: { temperature?: number; numPredict?: number } = {}) {
  return new ChatOllama({
    baseUrl: process.env.OLLAMA_BASE_URL?.trim() || "http://127.0.0.1:11434",
    model: getOllamaModelName(),
    temperature: options.temperature ?? 0,
    numPredict: options.numPredict
  });
}
