import { skillKey } from "@/lib/skills";

// Learning plan toward a target job. The plan itself (which skill each week, what to do) can be written by the AI,
// but the links are NEVER model output: they come from the fixed table below, so no link is ever invented.

export interface Resource {
  title: string;
  url: string;
}

const R: Record<string, Resource> = {
  javascript: { title: "JavaScript.info: The Modern JavaScript Tutorial", url: "https://javascript.info/" },
  typescript: { title: "TypeScript Handbook", url: "https://www.typescriptlang.org/docs/handbook/intro.html" },
  react: { title: "React: Learn", url: "https://react.dev/learn" },
  nextjs: { title: "Next.js: Learn", url: "https://nextjs.org/learn" },
  nodejs: { title: "Node.js: Learn", url: "https://nodejs.org/en/learn" },
  html: { title: "web.dev: Learn HTML", url: "https://web.dev/learn/html" },
  css: { title: "web.dev: Learn CSS", url: "https://web.dev/learn/css" },
  accessibility: { title: "web.dev: Learn Accessibility", url: "https://web.dev/learn/accessibility" },
  graphql: { title: "GraphQL: Learn", url: "https://graphql.org/learn/" },
  rest: { title: "MDN: HTTP overview", url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Overview" },
  testing: { title: "Testing Library: Introduction", url: "https://testing-library.com/docs/" },
  playwright: { title: "Playwright: Getting started", url: "https://playwright.dev/docs/intro" },
  cypress: { title: "Cypress: Getting started", url: "https://docs.cypress.io/app/get-started/why-cypress" },
  python: { title: "The Python Tutorial", url: "https://docs.python.org/3/tutorial/" },
  sql: { title: "SQLBolt: Learn SQL with simple exercises", url: "https://sqlbolt.com/" },
  postgresql: { title: "PostgreSQL Tutorial (official)", url: "https://www.postgresql.org/docs/current/tutorial.html" },
  mongodb: { title: "MongoDB University: free courses", url: "https://learn.mongodb.com/" },
  docker: { title: "Docker: Get started", url: "https://docs.docker.com/get-started/" },
  kubernetes: { title: "Kubernetes Basics (official tutorial)", url: "https://kubernetes.io/docs/tutorials/kubernetes-basics/" },
  git: { title: "Pro Git (free book)", url: "https://git-scm.com/book/en/v2" },
  linux: { title: "Linux Journey", url: "https://linuxjourney.com/" },
  aws: { title: "AWS Skill Builder: free digital training", url: "https://explore.skillbuilder.aws/learn" },
  terraform: { title: "Terraform: Get started", url: "https://developer.hashicorp.com/terraform/tutorials" },
  kotlin: { title: "Kotlin Docs: Getting started", url: "https://kotlinlang.org/docs/getting-started.html" },
  swift: { title: "The Swift Programming Language", url: "https://docs.swift.org/swift-book/" },
  reactnative: { title: "React Native: Getting started", url: "https://reactnative.dev/docs/getting-started" },
  rust: { title: "The Rust Programming Language (book)", url: "https://doc.rust-lang.org/book/" },
  go: { title: "A Tour of Go", url: "https://go.dev/tour/" },
  java: { title: "Dev.java: Learn Java", url: "https://dev.java/learn/" },
  machinelearning: { title: "Google: Machine Learning Crash Course", url: "https://developers.google.com/machine-learning/crash-course" },
  pytorch: { title: "PyTorch: Tutorials", url: "https://pytorch.org/tutorials/" },
  statistics: { title: "Khan Academy: Statistics and probability", url: "https://www.khanacademy.org/math/statistics-probability" },
  systemdesign: { title: "System Design Primer (GitHub)", url: "https://github.com/donnemartin/system-design-primer" },
  figma: { title: "Figma: Learn design", url: "https://www.figma.com/resource-library/" },
  seo: { title: "Google Search Central: SEO Starter Guide", url: "https://developers.google.com/search/docs/fundamentals/seo-starter-guide" },
  excel: { title: "Microsoft: Excel video training", url: "https://support.microsoft.com/en-us/excel" },
  powerbi: { title: "Microsoft Learn: Power BI", url: "https://learn.microsoft.com/en-us/training/powerplatform/power-bi" },
};

const GENERIC: Resource = { title: "roadmap.sh: step-by-step guides by role and skill", url: "https://roadmap.sh/" };

/** One link for a skill: from the fixed table when we know the skill, otherwise a general guide. Never invented. */
export function resourceFor(skill: string): Resource {
  return R[skillKey(skill)] ?? GENERIC;
}

export interface PlanWeek {
  week: number;
  skill: string;
  tasks: string[];
}

const MAX_WEEKS = 8;

/** The plain plan: one missing skill per one or two weeks, with three fixed steps each. */
export function plainRoadmap(missing: string[], weeks: number): PlanWeek[] {
  const total = Math.min(Math.max(weeks, 2), MAX_WEEKS);
  if (missing.length === 0) {
    return [
      { week: 1, skill: "Portfolio", tasks: ["Pick the two projects that best show what this role asks for.", "Write a short README for each: the problem, your part, the result.", "Link both from your profile summary."] },
      { week: 2, skill: "Interviews", tasks: ["Practise the interview for this role on the Practice page.", "Prepare two stories with a number in each.", "Ask a recruiter one specific question about the team."] },
    ].slice(0, total);
  }
  const skills = missing.slice(0, total);
  // Spread skills across the weeks; with fewer skills than weeks, each gets more than one week.
  const per = Math.max(1, Math.floor(total / skills.length));
  const out: PlanWeek[] = [];
  let week = 1;
  for (const skill of skills) {
    for (let n = 0; n < per && week <= total; n++, week++) {
      out.push({
        week,
        skill,
        tasks:
          n === 0
            ? [`Work through the basics of ${skill} using the linked guide.`, `Note three things the job would have you do with ${skill}.`, `Write one page of what you learned, in your own words.`]
            : [`Build a small project that uses ${skill} end to end.`, `Put it on GitHub with a short README.`, `Add ${skill} to your profile and mention the project.`],
      });
    }
  }
  return out;
}

export interface RoadmapRow {
  week: number;
  skill: string;
  task: string;
  resource_title: string;
  resource_url: string;
}

/** Flattens a plan to one row per task and attaches the fixed links. Anything the model supplied beyond text is ignored. */
export function planToRows(plan: PlanWeek[]): RoadmapRow[] {
  return plan
    .filter((w) => w.week >= 1 && w.week <= 12)
    .flatMap((w) => {
      const res = resourceFor(w.skill);
      return w.tasks.slice(0, 4).map((task) => ({ week: w.week, skill: w.skill.slice(0, 60), task: task.slice(0, 300), resource_title: res.title, resource_url: res.url }));
    });
}

export function progress(items: { done: boolean }[]): { done: number; total: number; percent: number } {
  const done = items.filter((i) => i.done).length;
  return { done, total: items.length, percent: items.length ? Math.round((done / items.length) * 100) : 0 };
}
