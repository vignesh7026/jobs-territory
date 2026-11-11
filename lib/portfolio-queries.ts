import "server-only";
import { z } from "zod";
import { isGithubUsername, type Repo } from "@/lib/portfolio";

const repoSchema = z.object({
  name: z.string(),
  language: z.string().nullable(),
  topics: z.array(z.string()).optional().default([]),
  description: z.string().nullable(),
  fork: z.boolean(),
  archived: z.boolean(),
});

export type RepoResult = { ok: true; repos: Repo[] } | { ok: false; message: string };

/**
 * A person's public repositories, as GitHub lists them to anyone. No token, so GitHub's anonymous limit (60 requests an
 * hour per address) applies; hitting it is reported plainly. Only the username leaves our server, and only to GitHub.
 */
export async function fetchPublicRepos(username: string): Promise<RepoResult> {
  if (!isGithubUsername(username)) return { ok: false, message: "That is not a valid GitHub username." };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=60&sort=pushed&type=owner`, {
      signal: controller.signal,
      headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "jobs-portal-skill-scan" },
      cache: "no-store",
    });
    if (res.status === 404) return { ok: false, message: "No GitHub user with that name." };
    if (res.status === 403 || res.status === 429) return { ok: false, message: "GitHub is limiting requests right now. Try again in a few minutes." };
    if (!res.ok) return { ok: false, message: "GitHub did not answer properly. Try again." };
    const parsed = z.array(repoSchema).safeParse(await res.json());
    if (!parsed.success) return { ok: false, message: "GitHub sent something unexpected. Try again." };
    return { ok: true, repos: parsed.data };
  } catch {
    return { ok: false, message: "Could not reach GitHub. Check your connection and try again." };
  } finally {
    clearTimeout(timer);
  }
}
