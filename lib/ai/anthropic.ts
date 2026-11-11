import "server-only";

/** Raised for anything that stops a model call from producing text. Callers fall back to the plain result. */
export class AiError extends Error {
  constructor(
    message: string,
    /** HTTP status when the API answered, 0 for network/timeout/config problems */
    readonly status: number,
    /** true when retrying soon cannot help (no key, no credit, bad key) */
    readonly permanent = false,
  ) {
    super(message);
  }
}

export interface ModelRequest {
  system: string;
  user: string;
  maxTokens: number;
}

// ANTHROPIC_BASE_URL is only for tests against a local stand-in; production uses the real API.
const endpoint = () => `${(process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com").replace(/\/$/, "")}/v1/messages`;
const TIMEOUT_MS = 20_000;

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

/** Groq's OpenAI-compatible chat completions API. Same contract: text out, AiError on any failure. */
async function callGroq(req: ModelRequest, key: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(GROQ_ENDPOINT, {
      method: "POST",
      signal: controller.signal,
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
        // gpt-oss is a reasoning model: reasoning tokens count against the limit, so leave headroom and keep it short.
        max_tokens: req.maxTokens + 400,
        reasoning_effort: "low",
        temperature: 0.3,
        messages: [
          { role: "system", content: req.system },
          { role: "user", content: req.user },
        ],
      }),
    });
    if (!res.ok) throw new AiError(`Groq API returned ${res.status}`, res.status, [400, 401, 403].includes(res.status));
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = json.choices?.[0]?.message?.content;
    if (!text) throw new AiError("The model returned no text", res.status);
    return text;
  } catch (e) {
    if (e instanceof AiError) throw e;
    throw new AiError(e instanceof Error && e.name === "AbortError" ? "The model took too long to answer" : "Could not reach the model", 0);
  } finally {
    clearTimeout(timer);
  }
}

/** One model call: Groq when GROQ_API_KEY is set, otherwise the Anthropic Messages API. The key is read on the server only and never sent anywhere else. */
export async function callAnthropic(req: ModelRequest): Promise<string> {
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) return callGroq(req, groqKey);
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new AiError("No AI key is set (GROQ_API_KEY or ANTHROPIC_API_KEY)", 0, true);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(endpoint(), {
      method: "POST",
      signal: controller.signal,
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-haiku-5-5",
        max_tokens: req.maxTokens,
        system: req.system,
        messages: [{ role: "user", content: req.user }],
      }),
    });
    if (!res.ok) {
      // Never include the response body in logs or errors: it can echo request details.
      const permanent = [400, 401, 403].includes(res.status);
      throw new AiError(`Anthropic API returned ${res.status}`, res.status, permanent);
    }
    const json = (await res.json()) as { content?: { type: string; text?: string }[] };
    const text = json.content?.find((c) => c.type === "text")?.text;
    if (!text) throw new AiError("The model returned no text", res.status);
    return text;
  } catch (e) {
    if (e instanceof AiError) throw e;
    throw new AiError(e instanceof Error && e.name === "AbortError" ? "The model took too long to answer" : "Could not reach the model", 0);
  } finally {
    clearTimeout(timer);
  }
}
