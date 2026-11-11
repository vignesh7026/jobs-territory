import { describe, expect, it } from "vitest";
import { groundSkills, mergeSkills, plainVoiceDraft, skillsNamedIn, tidyTranscript } from "@/lib/voice-profile";

const said =
  "Um, so I am a backend developer, you know, about three years in fintech. I mostly write Node.js and PostgreSQL, some TypeScript, and i have used Docker on AWS. I want to move into system design.";

describe("tidyTranscript", () => {
  it("drops filler words and fixes spacing and the pronoun I", () => {
    const t = tidyTranscript("um  so i built   things, you know, with react");
    expect(t).toBe("So I built things, with react");
  });
  it("cuts long text at a sentence end", () => {
    const long = "First sentence here. ".repeat(40);
    const t = tidyTranscript(long, 100);
    expect(t.length).toBeLessThanOrEqual(100);
    expect(t.endsWith(".")).toBe(true);
  });
});

describe("skillsNamedIn", () => {
  it("finds named skills whole-word, in the order mentioned", () => {
    expect(skillsNamedIn(said)).toEqual(["Node.js", "PostgreSQL", "TypeScript", "Docker", "AWS", "System Design"]);
  });
  it("does not match inside other words", () => {
    expect(skillsNamedIn("I like going to the gym")).not.toContain("Go");
    expect(skillsNamedIn("a javascripty person")).not.toContain("JavaScript");
  });
});

describe("plain draft", () => {
  it("builds headline, summary and skills from what was said, and nothing else", () => {
    const d = plainVoiceDraft(said);
    expect(d.headline).toBe("So I am a backend developer, about three years in fintech");
    expect(d.summary.startsWith("So I am a backend developer")).toBe(true);
    expect(d.skills).toContain("Node.js");
    expect(d.skills).not.toContain("Python");
  });
});

describe("grounding AI output", () => {
  it("drops skills the speaker never mentioned and fixes spelling", () => {
    expect(groundSkills(["typescript", "Python", "node", "Kubernetes"], said)).toEqual(["TypeScript", "Node.js"]);
  });
  it("removes duplicates", () => expect(groundSkills(["Docker", "docker"], said)).toEqual(["Docker"]));
});

describe("mergeSkills", () => {
  it("adds only new ones, comparing by skill key", () => expect(mergeSkills(["React", "NodeJS"], ["Node.js", "Docker"])).toEqual(["React", "NodeJS", "Docker"]));
});
