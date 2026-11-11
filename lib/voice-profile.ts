import { SKILL_VOCABULARY, canonicalSkill, skillKey } from "@/lib/skills";

// Turning a spoken (or typed) minute about yourself into profile fields. This file is the plain, non-AI version:
// tidy the transcript, and pick out skills the person actually named. The AI version (lib/ai/features.ts) writes a
// better headline and summary, but must only use what was said, and its skills are filtered through the same check.

export interface VoiceDraft {
  headline: string;
  summary: string;
  skills: string[];
}

const FILLER = /\b(um+|uh+|erm|you know|like,|i mean|sort of|kind of)\b[,.]?\s*/gi;

/** Removes filler, repeated spaces and stray capitalisation of "i", and trims to whole sentences within `max` characters. */
export function tidyTranscript(raw: string, max = 600): string {
  const cleaned = raw
    .replace(FILLER, "")
    .replace(/\s+/g, " ")
    .replace(/\bi\b/g, "I")
    .trim();
  if (cleaned.length <= max) return capitalise(cleaned);
  const cut = cleaned.slice(0, max);
  const lastStop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
  return capitalise(lastStop > max * 0.5 ? cut.slice(0, lastStop + 1) : cut.replace(/\s+\S*$/, "") + "…");
}

const capitalise = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** Skills from the vocabulary that the speaker named, in the order first mentioned. Whole-word, case-insensitive. */
export function skillsNamedIn(text: string): string[] {
  const found: { skill: string; at: number }[] = [];
  const hay = ` ${text.toLowerCase().replace(/[^a-z0-9+#./ ]/g, " ")} `;
  for (const skill of SKILL_VOCABULARY) {
    const needle = skill.toLowerCase();
    const re = new RegExp(`(?<![a-z0-9])${needle.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}(?![a-z0-9])`);
    const m = re.exec(hay);
    if (m) found.push({ skill, at: m.index });
  }
  return found.sort((a, b) => a.at - b.at).map((f) => f.skill);
}

export function plainVoiceDraft(transcript: string): VoiceDraft {
  const summary = tidyTranscript(transcript);
  const firstSentence = summary.split(/(?<=[.!?])\s/)[0] ?? "";
  return {
    headline: firstSentence.length > 0 && firstSentence.length <= 120 ? firstSentence.replace(/[.!?]+$/, "") : "",
    summary,
    skills: skillsNamedIn(transcript).slice(0, 12),
  };
}

/** Keeps only skills actually present in the transcript (by the same key used for matching), canonical spelling. */
export function groundSkills(proposed: string[], transcript: string): string[] {
  const spoken = new Map(skillsNamedIn(transcript).map((s) => [skillKey(s), s]));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of proposed) {
    const k = skillKey(canonicalSkill(s));
    const spelled = spoken.get(k);
    if (spelled && !seen.has(k)) {
      seen.add(k);
      out.push(spelled);
    }
  }
  return out;
}

/** Adds new skills to an existing list without duplicates (by skill key). */
export function mergeSkills(existing: string[], added: string[]): string[] {
  const keys = new Set(existing.map(skillKey));
  const out = [...existing];
  for (const s of added) {
    const k = skillKey(s);
    if (!keys.has(k)) {
      keys.add(k);
      out.push(s);
    }
  }
  return out;
}
