import type { Metadata } from "next";
import { CareerTimeline } from "@/components/career/timeline";
import { RoadmapPanel } from "@/components/career/roadmap-panel";
import { requireUser } from "@/lib/auth/session";
import { getCareerData } from "@/lib/career-queries";

export const metadata: Metadata = { title: "Career" };

export default async function CareerPage(props: PageProps<"/career">) {
  const user = await requireUser("/career");
  const sp = await props.searchParams;
  const data = await getCareerData(user.id);
  const target = typeof sp.target === "string" ? sp.target : null;

  return (
    <section className="container py-8 md:py-10">
      <h1 className="text-3xl">Career</h1>
      <p className="mb-8 mt-2 max-w-prose text-muted">Where your profile says you have been, the next step up, and a plan to get there.</p>

      <h2 className="mb-4 text-xl">Your path</h2>
      <CareerTimeline nodes={data.nodes} targets={data.targets} level={data.level} />

      <h2 className="mb-4 mt-12 text-xl">Learning plan</h2>
      <RoadmapPanel jobs={data.jobs} initialSlug={target ?? data.targets[0]?.slug ?? null} items={data.roadmap} />
    </section>
  );
}
