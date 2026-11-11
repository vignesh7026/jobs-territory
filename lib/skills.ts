// Skill vocabulary: suggestions in the profile form, and canonical spellings for matching.
export const SKILL_VOCABULARY = [
  "JavaScript", "TypeScript", "React", "Next.js", "Node.js", "Express", "HTML", "CSS", "Tailwind CSS", "Accessibility", "GraphQL", "REST APIs", "Testing", "Playwright", "Cypress",
  "Python", "Java", "Go", "C++", "C#", "Kotlin", "Swift", "React Native", "Android", "Unity", "Rust",
  "SQL", "PostgreSQL", "MySQL", "MongoDB", "Redis", "Kafka", "dbt", "Data Modeling", "Distributed Systems", "System Design",
  "Docker", "Kubernetes", "Terraform", "AWS", "Azure", "Linux", "Git", "CI/CD", "Prometheus", "Networking", "SIEM", "Incident Response",
  "Machine Learning", "PyTorch", "Computer Vision", "MLOps", "Statistics", "Excel", "Power BI", "Analytics", "Data Analysis",
  "Figma", "Prototyping", "User Research", "Design Systems", "Illustration", "Animation",
  "Communication", "Leadership", "Project Management", "Stakeholder Management", "Roadmapping", "Presentation", "Technical Writing", "Public Speaking",
  "SEO", "Content Writing", "Editing", "Google Ads", "Experimentation", "CRM", "Zendesk", "Empathy",
  "Recruitment", "Sourcing", "Interviewing", "ATS", "Scheduling", "Documentation",
  "Operations", "Logistics", "Lean", "Safety", "Risk", "Troubleshooting", "APIs", "AutoCAD", "MATLAB", "Electrical Engineering",
] as const;

/** Case-insensitive lookup to the canonical spelling ("typescript" -> "TypeScript"); unknown skills keep what was typed. */
const canonical = new Map(SKILL_VOCABULARY.map((s) => [s.toLowerCase(), s as string]));
export const canonicalSkill = (raw: string) => canonical.get(raw.trim().toLowerCase()) ?? raw.trim();

/**
 * Comparison key for a skill: lower-case, punctuation removed, common aliases folded together,
 * so "Node.js", "nodejs" and "NodeJS" are the same skill and "REST APIs" matches "REST".
 */
const ALIASES: Record<string, string> = {
  nodejs: "nodejs", node: "nodejs", reactjs: "react", nextjs: "nextjs", js: "javascript", ts: "typescript",
  postgres: "postgresql", postgresql: "postgresql", psql: "postgresql", k8s: "kubernetes", golang: "go",
  restapis: "rest", restapi: "rest", restful: "rest", restfulapis: "rest", apis: "rest", api: "rest",
  cicd: "cicd", tailwind: "tailwindcss", tailwindcss: "tailwindcss", ml: "machinelearning", powerbi: "powerbi",
  msexcel: "excel", microsoftexcel: "excel", gcp: "googlecloud", googlecloudplatform: "googlecloud",
};
export function skillKey(skill: string): string {
  const k = skill.toLowerCase().replace(/[^a-z0-9+#]/g, "");
  return ALIASES[k] ?? k;
}
