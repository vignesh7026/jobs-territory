"use client";

import { useState } from "react";
import { MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSearch } from "@/components/jobs/search-context";
import { withFilters } from "@/lib/jobs/filters";

/** Keyword + location. Submitting puts them in the URL (and resets to page 1). */
export function SearchBar({ initialQ, initialLocation }: { initialQ: string; initialLocation: string }) {
  const { filters, push, pending } = useSearch();
  const [q, setQ] = useState(initialQ);
  const [location, setLocation] = useState(initialLocation);

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        push(withFilters(filters, { q: q.trim(), location: location.trim() }));
      }}
      className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]"
    >
      <div className="grid gap-1.5">
        <Label htmlFor="q">Role or skill</Label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <Input id="q" name="q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Backend developer, Figma" className="pl-9" autoComplete="off" maxLength={100} />
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="location">Location</Label>
        <div className="relative">
          <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <Input id="location" name="location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Coimbatore, Dublin" className="pl-9" autoComplete="off" maxLength={80} />
        </div>
      </div>
      <Button type="submit" variant="primary" disabled={pending} className="self-end sm:h-10">
        Search jobs
      </Button>
    </form>
  );
}
