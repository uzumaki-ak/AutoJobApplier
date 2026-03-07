import { aiLogger } from "@/lib/logger";

type EuriMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type EuriChatOptions = {
  messages: EuriMessage[];
  model?: string;
  max_tokens?: number;
  temperature?: number;
};

export async function callEuriChat(opts: EuriChatOptions): Promise<string> {
  const apiKey = process.env.EURI_API_KEY;
  if (!apiKey) {
    throw new Error("EURI_API_KEY is not configured.");
  }

  const body = {
    messages: opts.messages,
    model: opts.model ?? process.env.EURI_MODEL ?? "gpt-4.1-nano",
    max_tokens: opts.max_tokens ?? 1200,
    temperature: opts.temperature ?? 0.6,
  };

  const start = Date.now();
  const response = await fetch("https://api.euron.one/api/v1/euri/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    aiLogger.error({ status: response.status, text }, "Euri API call failed");
    throw new Error("Euri API call failed");
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content ?? "";
  aiLogger.info({ duration: Date.now() - start }, "Euri call succeeded");
  return String(content).trim();
}
