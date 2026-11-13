import { deflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { readResume, type ParsedResume } from "@/lib/resume";
import { itemsToLines } from "@/lib/resume/pdf-text";
import { fillFromResume, type FillableProfile } from "@/lib/resume/to-profile";
import { RESUME_TEXT, makePdf } from "./fixtures/resume-sample";

const empty: FillableProfile = { fullName: "", phone: "", location: "", headline: "", githubUsername: "", summary: "", skills: [], experience: [], education: [] };
const enc = (s: string) => new TextEncoder().encode(s);

/** Read a resume given as plain text, failing the test with the reader's message if it cannot. */
async function fromText(text: string): Promise<ParsedResume> {
  const r = await readResume(enc(text), "resume.txt");
  if (!r.ok) throw new Error(r.error);
  return r.parsed;
}

const sample = await readResume(makePdf(RESUME_TEXT), "resume.pdf");
if (!sample.ok) throw new Error(sample.error);

describe("readResume (PDF)", () => {
  const p = sample.parsed;
  it("finds name, email, phone, location and headline", () => {
    expect(sample.name).toBe("Karthik Raman");
    expect(sample.email).toBe("karthik.raman@example.com");
    expect(p.phone).toBe("+91 98430 27719");
    expect(p.location).toBe("Coimbatore, Tamil Nadu");
    expect(p.headline).toBe("Frontend Developer");
  });
  it("reads the summary and the listed skills, without domain words from the prose", () => {
    expect(p.bio).toContain("accessible React interfaces");
    expect(p.skills).toEqual(expect.arrayContaining(["React", "TypeScript", "JavaScript", "Node.js", "Tailwind CSS", "Jest", "Git"]));
    expect(p.skills).not.toContain("Logistics");
  });
  it("reads roles with company, period and what was done", () => {
    expect(p.experience).toHaveLength(2);
    expect(p.experience[0]).toMatchObject({ title: "Frontend Developer", company: "Orchard Cloud", period: "Jun 2023 - Present" });
    expect(p.experience[0].description).toContain("billing dashboard");
    expect(p.experience[1]).toMatchObject({ title: "Web Developer Intern", company: "Brightwell Labs" });
  });
  it("reads education and links", () => {
    expect(p.education[0]).toMatchObject({ degree: "B.E. Computer Science and Engineering", year: "2023" });
    expect(p.education[0].school).toContain("PSG College of Technology");
    expect(p.links.github).toBe("https://github.com/karthikraman");
    expect(p.links.linkedin).toContain("linkedin.com/in/karthik-raman");
    expect(p.experienceYears).toBe(3);
  });
});

describe("readResume edge cases", () => {
  it("reads a compressed (FlateDecode) PDF stream too", async () => {
    const text = ["BT", "/F1 11 Tf", "72 760 Td", ...RESUME_TEXT.split("\n").map((l) => `0 -14 Td (${l.replace(/[()\\]/g, "")}) Tj`), "ET"].join("\n");
    const data = deflateSync(Buffer.from(text, "latin1"));
    const head = Buffer.from(`%PDF-1.4\n1 0 obj\n<< /Filter /FlateDecode /Length ${data.length} >>\nstream\n`, "latin1");
    const tail = Buffer.from("\nendstream\nendobj\n%%EOF\n", "latin1");
    const r = await readResume(new Uint8Array(Buffer.concat([head, data, tail])), "resume.pdf");
    expect(r.ok && r.parsed.skills.includes("React")).toBe(true);
  });
  it("says so for a PDF with no text layer (a scan)", async () => {
    const r = await readResume(enc("%PDF-1.4\n1 0 obj\n<< /Subtype /Image >>\nstream\nxxxx\nendstream\nendobj\n%%EOF"), "scan.pdf");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/No readable text/);
  });
  it("never throws on garbage", async () => {
    expect((await readResume(new Uint8Array([0, 1, 2, 3, 250, 251]), "x.bin")).ok).toBe(false);
    expect((await readResume(enc("%PDF-1.4 broken"), "a.pdf")).ok).toBe(false);
  });
  it("reads a plain-text resume as well", async () => {
    const r = await readResume(enc(RESUME_TEXT), "resume.txt");
    expect(r.ok && r.name).toBe("Karthik Raman");
  });
});

describe("itemsToLines (rebuilding lines from positioned text)", () => {
  const it_ = (s: string, x: number, y: number, w = s.length * 5) => ({ s, x, y, w });
  it("orders a line left to right even when its pieces sit a hair apart vertically", () => {
    // the label is slightly LOWER than the values, which used to put it last: "SQLLanguages:"
    const lines = itemsToLines([it_("Python, JavaScript, SQL", 90, 700.4), it_("Languages:", 20, 699.9)]);
    expect(lines).toEqual(["Languages: Python, JavaScript, SQL"]);
  });
  it("puts a space at visible gaps only, and starts a new line when the baseline moves", () => {
    const lines = itemsToLines([it_("Bengaluru,", 10, 700, 50), it_("Karnataka", 62, 700, 45), it_("Next", 10, 680, 20), it_("line", 30, 680, 20)]);
    expect(lines).toEqual(["Bengaluru, Karnataka", "Nextline"]);
  });
});

describe("education", () => {
  it("does not read the word 'be' in 'Deemed to be University' as a B.E. degree", async () => {
    const p = await fromText("Asha Menon\nasha@example.com\n\nEDUCATION\nCHRIST (Deemed to be University), Bengaluru\nBachelor of Computer Applications (BCA), Computer Science, expected May 2027\n");
    expect(p.education).toHaveLength(1);
    expect(p.education[0].degree).toBe("Bachelor of Computer Applications (BCA), Computer Science");
    expect(p.education[0].school).toContain("CHRIST");
    expect(p.education[0].year).toBe("2027");
  });
  it("still reads a real B.E. written in capitals", async () => {
    const p = await fromText("Ravi Kumar\n\nEDUCATION\nB.E. Mechanical Engineering, Anna University 2020\n");
    expect(p.education[0].degree).toMatch(/^B\.E\./);
  });
  it("splits a row with the school on the left and the degree wrapping onto the next line", async () => {
    const p = await fromText("Asha Menon\n\nEDUCATION\nCHRIST (Deemed to be University), Bengaluru, Karnataka Bachelor of Computer\nApplications (BCA), Computer Science. Expected May 2027\n");
    expect(p.education).toHaveLength(1);
    expect(p.education[0].school).toBe("CHRIST (Deemed to be University), Bengaluru, Karnataka");
    expect(p.education[0].degree).toBe("Bachelor of Computer Applications (BCA), Computer Science");
  });
});

describe("experience", () => {
  it("company line first, then the title with its dates: the title is the title", async () => {
    const p = await fromText("Asha Menon\n\nEXPERIENCE\n8Queens Software Technology | Chennai, Tamil Nadu\nWeb Development Intern Apr 2025 – May 2025\n• Built pages with REST APIs\n");
    expect(p.experience[0]).toMatchObject({ title: "Web Development Intern", company: "8Queens Software Technology", period: "Apr 2025 – May 2025" });
  });
  it("title first, then the company and city", async () => {
    const p = await fromText("Asha Menon\n\nEXPERIENCE\nUI/UX Design Intern\nInfonel Technologies, Tirunelveli, India\nMay 2025 – Jun 2025\n• Designed a doctor app in Figma\n");
    expect(p.experience[0]).toMatchObject({ title: "UI/UX Design Intern", company: "Infonel Technologies" });
  });
  it("title and company on one line, in either order", async () => {
    const a = await fromText("Asha Menon\n\nEXPERIENCE\nData Analyst at Acme Corp\nJan 2024 – Dec 2024\n• Built reports\n");
    expect(a.experience[0]).toMatchObject({ title: "Data Analyst", company: "Acme Corp" });
    const b = await fromText("Asha Menon\n\nEXPERIENCE\nAcme Corp | Data Analyst\nJan 2024 – Dec 2024\n• Built reports\n");
    expect(b.experience[0]).toMatchObject({ title: "Data Analyst", company: "Acme Corp" });
  });
  it("joins a bullet that wraps onto a second line instead of splitting the sentence", async () => {
    const p = await fromText("Asha Menon\n\nEXPERIENCE\nData Analyst, Acme Corp\nJan 2024 – Dec 2024\n• Built dashboards through REST\nAPIs and MySQL.\n• Cut report time in half.\n");
    expect(p.experience[0].description).toContain("through REST APIs and MySQL");
  });
  it("ignores page numbers and repeated name headers", async () => {
    const p = await fromText("Asha Menon\nAsha Menon\nasha@example.com\n\nEXPERIENCE\nData Analyst, Acme Corp\nJan 2024 – Dec 2024\n• Built reports.\nPage 1 of 2\nAsha Menon\nAsha Menon – Data Analyst Resume\n• Cut costs.\n");
    expect(p.experience).toHaveLength(1);
  });
});

describe("projects", () => {
  it("reads 'Name – Subtitle (dates) Tech,' with the technologies wrapping to the next line", async () => {
    const p = await fromText("Asha Menon\n\nPROJECTS\nRepo Pulse – Repository Health Analyzer (Jun 2026 – Jul 2026) React, TypeScript,\nVite, FastAPI, Docker\nBuilt a dashboard that scores repositories\nusing a weighted engine.\nWrote unit tests for the engine.\n");
    expect(p.experience[0]).toMatchObject({ title: "Repo Pulse – Repository Health Analyzer", company: "Personal project", period: "Jun 2026 – Jul 2026" });
    expect(p.experience[0].description).toContain("Technologies: React, TypeScript, Vite, FastAPI, Docker");
    expect(p.experience[0].description).toContain("scores repositories using a weighted engine");
  });
  it("reads 'Name | Tech list 2026'", async () => {
    const p = await fromText("Asha Menon\n\nPROJECTS\nCine Pathos | Next.js, TypeScript, Groq LLM 2026\n● Built a movie recommender.\nEco Sentinel | Python, MongoDB 2025\n● Built a disaster predictor.\n");
    expect(p.experience.map((e) => e.title)).toEqual(["Cine Pathos", "Eco Sentinel"]);
    expect(p.experience[0].period).toBe("2026");
    expect(p.experience[0].description).toContain("Technologies: Next.js, TypeScript, Groq LLM");
  });
  it("reads 'Name Mon YYYY' with the technologies on the next line", async () => {
    const p = await fromText("Asha Menon\n\nPROJECTS\nPayment Recovery Agent – AI Revenue Recovery Sep 2026\nPython, FastAPI, Razorpay API (Test Mode), REST APIs\n• Built a service that recovers failed payments.\n");
    expect(p.experience[0]).toMatchObject({ title: "Payment Recovery Agent – AI Revenue Recovery", period: "Sep 2026" });
    expect(p.experience[0].description).toContain("Technologies: Python, FastAPI, Razorpay API (Test Mode), REST APIs");
  });
});

describe("skills and headline", () => {
  it("a skills section keeps its items and stops at the next heading", async () => {
    const p = await fromText("Asha Menon\n\nTECHNICAL SKILLS\nLanguages: Python, JavaScript, SQL\nFrontend: React, Tailwind CSS\nCERTIFICATIONS AND LANGUAGES\nCertifications: Full Stack Web Development; UiPath RPA\n");
    expect(p.skills).toEqual(expect.arrayContaining(["Python", "JavaScript", "SQL", "React", "Tailwind CSS"]));
    expect(p.skills.join(" ")).not.toMatch(/CERTIFICATIONS/i);
  });
  it("with no headline line, uses how the summary describes the person", async () => {
    const p = await fromText("Asha Menon\nBengaluru, India | asha@example.com | +91 98430 27719\n\nPROFESSIONAL SUMMARY\nSoftware developer (BCA, 2027) who builds and ships full-stack applications end to end.\n");
    expect(p.headline).toBe("Software developer (BCA, 2027)");
  });
});

describe("fillFromResume", () => {
  const parsed = sample.parsed;

  it("fills an empty profile with everything it found", () => {
    const { values, filled } = fillFromResume(empty, parsed, sample.name);
    expect(values.fullName).toBe("Karthik Raman");
    expect(values.phone).toBe("+91 98430 27719");
    expect(values.headline).toBe("Frontend Developer");
    expect(values.githubUsername).toBe("karthikraman");
    expect(values.skills).toContain("React");
    expect(values.experience).toHaveLength(2);
    expect(values.education).toHaveLength(1);
    expect(filled).toEqual(expect.arrayContaining(["phone", "location", "headline", "summary", "2 roles", "1 education entry"]));
  });

  it("never overwrites what the person already wrote", () => {
    const mine: FillableProfile = {
      ...empty, fullName: "Karthik R", headline: "My own headline", summary: "My own summary", phone: "+91 90000 11111",
      skills: ["react", "Python"], experience: [{ title: "Mine", company: "Mine Co", period: "", description: "" }],
    };
    const { values } = fillFromResume(mine, parsed, sample.name);
    expect(values.fullName).toBe("Karthik R");
    expect(values.headline).toBe("My own headline");
    expect(values.summary).toBe("My own summary");
    expect(values.phone).toBe("+91 90000 11111");
    expect(values.experience).toEqual(mine.experience);
    expect(values.skills.filter((s) => s.toLowerCase() === "react")).toHaveLength(1);
    expect(values.skills).toContain("Python");
    expect(values.skills).toContain("TypeScript");
  });

  it("caps skills at 40, drops an invalid phone, and fills a missing company with a plain placeholder", () => {
    const many = { ...parsed, phone: "call me maybe", skills: Array.from({ length: 60 }, (_, i) => `Skill${i}`), experience: [{ title: "Dev", company: "", period: "", description: "" }] };
    const { values } = fillFromResume(empty, many);
    expect(values.skills).toHaveLength(40);
    expect(values.phone).toBe("");
    expect(values.experience[0].company).toBe("Company not listed");
  });

  it("running it twice changes nothing the second time", () => {
    const once = fillFromResume(empty, parsed, sample.name);
    const twice = fillFromResume(once.values, parsed, sample.name);
    expect(twice.values).toEqual(once.values);
    expect(twice.filled).toEqual([]);
  });
});

describe("technology lists that wrap", () => {
  it("joins a list that wrapped in the middle of an item, without a stray full stop", async () => {
    const p = await fromText("Asha Menon\n\nPROJECTS\nPayment Recovery Agent – AI Revenue Recovery (Sep 2026) Python, FastAPI, Razorpay\nAPI (Test Mode), LLM Agents, REST APIs\n• Built a service that recovers failed payments.\n");
    expect(p.experience[0].description).toContain("Technologies: Python, FastAPI, Razorpay API (Test Mode), LLM Agents, REST APIs");
    expect(p.experience[0].description).not.toContain("Razorpay.");
  });
});
