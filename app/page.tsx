import { MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Home. Left-aligned headline, one supporting line, the search bar. The 3D hero is added in a later commit.
export default function HomePage() {
  return (
    <section className="container py-12 md:py-20">
      <div className="max-w-2xl">
        <h1 className="text-3xl md:text-4xl">Find a role, see how you match, and track every application.</h1>
        <p className="mt-4 max-w-prose text-base text-muted">
          Each listing shows the pay, the skills it asks for and where you fall short, so you can decide before you apply.
        </p>

        {/* Plain GET form: works without JavaScript and produces a shareable URL. */}
        <form action="/jobs" method="get" role="search" className="mt-8 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <div className="grid gap-1.5">
            <Label htmlFor="q">Role or skill</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
              <Input id="q" name="q" placeholder="Backend developer, Figma" className="pl-9" autoComplete="off" />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="location">Location</Label>
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
              <Input id="location" name="location" placeholder="Coimbatore, Remote" className="pl-9" autoComplete="off" />
            </div>
          </div>
          <Button type="submit" variant="primary" className="self-end sm:h-10">
            Search jobs
          </Button>
        </form>
      </div>
    </section>
  );
}
