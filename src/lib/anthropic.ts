// ===========================================================================
// Anthropic (Claude) client + small helpers used by the AI service.
// Client is lazily initialised so the module can be imported at build time
// without ANTHROPIC_API_KEY being set.
// ===========================================================================

import Anthropic from "@anthropic-ai/sdk";
import { env } from "./config";

let _client: Anthropic | null = null;

function client(): Anthropic {
  if (!_client) _client = new Anthropic({ apiKey: env.anthropicApiKey });
  return _client;
}

/**
 * Call Claude and return plain text. Used for customer-facing replies.
 */
export async function completeText(opts: {
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
}): Promise<string> {
  const res = await client().messages.create({
    model: env.anthropicModel,
    max_tokens: opts.maxTokens ?? 400,
    temperature: opts.temperature ?? 0.4,
    system: opts.system,
    messages: [{ role: "user", content: opts.user }],
  });

  return res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
}

/**
 * Stream a Claude reply as plain UTF-8 text chunks, suitable for returning
 * directly as a fetch Response body. Used by the owner assistant chat.
 */
export function streamText(opts: {
  system: string;
  messages: { role: "user" | "assistant"; content: string }[];
  maxTokens?: number;
  temperature?: number;
}): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      try {
        const stream = client().messages.stream({
          model: env.anthropicModel,
          max_tokens: opts.maxTokens ?? 1024,
          temperature: opts.temperature ?? 0.5,
          system: opts.system,
          messages: opts.messages,
        });
        stream.on("text", (delta) => controller.enqueue(encoder.encode(delta)));
        await stream.finalMessage();
        controller.close();
      } catch (e) {
        controller.enqueue(encoder.encode(`\n\n[error] ${String(e)}`));
        controller.close();
      }
    },
  });
}

/**
 * Call Claude and parse a JSON object out of the response.
 * Tolerant of code fences and stray prose around the JSON.
 */
export async function completeJson<T>(opts: {
  system: string;
  user: string;
  maxTokens?: number;
}): Promise<T> {
  const raw = await completeText({
    system: opts.system,
    user: opts.user,
    maxTokens: opts.maxTokens ?? 500,
    temperature: 0,
  });

  const cleaned = raw
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const slice = start >= 0 && end >= 0 ? cleaned.slice(start, end + 1) : cleaned;

  return JSON.parse(slice) as T;
}
