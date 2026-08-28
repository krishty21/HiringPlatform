// AI provider factory. Per directive §3.3 + §10:
// Zero key = Mock, silently. Switch via AI_PROVIDER env var.
import { MockProvider } from "./mock-provider";
import { ZAIProvider } from "./zai-provider";
import type { AIProvider } from "./provider";

function pick(): AIProvider {
  const provider = process.env.AI_PROVIDER ?? "mock";
  if (provider === "zai") return ZAIProvider;
  return MockProvider;
}

let cached: AIProvider | null = null;
export function getAIProvider(): AIProvider {
  if (cached) return cached;
  cached = pick();
  return cached;
}

export function isDemoMode(): boolean {
  return (process.env.AI_PROVIDER ?? "mock") !== "zai";
}
