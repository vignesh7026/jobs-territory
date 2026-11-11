import { SKILL_VOCABULARY, skillKey } from "@/lib/skills";
import { skillsNamedIn } from "@/lib/voice-profile";

// Suggesting skills from public repositories. Pure: it takes repository facts (language, topics, description) and says
// which known skills they point to, and in which repositories. It reads only what GitHub already shows publicly, never
// code. The candidate decides what goes on the profile.

export interface Repo {
  name: string;
  language: string | null;
  topics: string[];
  description: string | null;
  fork: boolean;
  archived: boolean;
}

export interface SkillEvidence {
  skill: string;
  /** repository names that point to this skill, most first, at most 4 */
  repos: string[];
  count: number;
  onProfile: boolean;
}

/** GitHub's rule: 1 to 39 characters, letters, digits and single hyphens, not starting or ending with a hyphen. */
export const GITHUB_USERNAME = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/;
export const isGithubUsername = (v: string) => GITHUB_USERNAME.test(v) && !v.endsWith("-");

// GitHub language names that differ from our skill names.
const LANGUAGE_ALIASES: Record<string, string> = { "c++": "C++", "c#": "C#", "jupyter notebook": "Python", shell: "Linux", dockerfile: "Docker", hcl: "Terraform", html: "HTML", css: "CSS" };
const BY_KEY = new Map(SKILL_VOCABULARY.map((s) => [skillKey(s), s as string]));

function fromLabel(label: string): string | null {
  const lower = label.trim().toLowerCase();
  const alias = LANGUAGE_ALIASES[lower];
  if (alias) return alias;
  return BY_KEY.get(skillKey(label)) ?? null;
}

export function inferSkills(repos: Repo[], profileSkills: string[]): SkillEvidence[] {
  const have = new Set(profileSkills.map(skillKey));
  const found = new Map<string, Set<string>>();
  const note = (skill: string | null, repo: string) => {
    if (!skill) return;
    if (!found.has(skill)) found.set(skill, new Set());
    found.get(skill)!.add(repo);
  };

  // Forks are other people's code and archived repositories are old news; neither shows what you do now.
  for (const r of repos.filter((x) => !x.fork && !x.archived)) {
    if (r.language) note(fromLabel(r.language), r.name);
    for (const t of r.topics) note(fromLabel(t.replace(/-/g, " ")) ?? fromLabel(t.replace(/-/g, "")), r.name);
    if (r.description) for (const s of skillsNamedIn(r.description)) note(s, r.name);
  }

  return [...found.entries()]
    .map(([skill, names]) => ({ skill, repos: [...names].slice(0, 4), count: names.size, onProfile: have.has(skillKey(skill)) }))
    .sort((a, b) => b.count - a.count || a.skill.localeCompare(b.skill));
}
