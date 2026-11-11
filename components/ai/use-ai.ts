"use client";

export type AiSource = "ai" | "cache" | "fallback";
export interface AiResponse<T> {
  data: T;
  source: AiSource;
}

/** Calls an AI route. Resolves with the data (AI or plain fallback) or rejects with a message safe to show. */
export async function postAi<T>(kind: "match" | "gap" | "summary" | "cover-letter" | "follow-up" | "negotiate", body: Record<string, string>): Promise<AiResponse<T>> {
  let res: Response;
  try {
    res = await fetch(`/api/ai/${kind}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  } catch {
    throw new Error("We could not reach the server. Check your connection.");
  }
  const json = (await res.json().catch(() => ({}))) as Partial<AiResponse<T>> & { error?: string };
  if (!res.ok || json.data === undefined) throw new Error(json.error ?? "Something went wrong. Try again.");
  return { data: json.data, source: json.source ?? "fallback" };
}

/** True when the text really came from the model (fresh or cached), as opposed to the plain fallback. */
export const isAi = (s: AiSource) => s === "ai" || s === "cache";
