import { ShieldAlert, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

/**
 * Whether an admin has checked this company. Shown with an icon and a word, never colour alone. An unverified company
 * is not accused of anything: it simply has not been checked yet, and the title says what that means.
 */
export function VerifiedBadge({ verified, note }: { verified: boolean; note?: string | null }) {
  return verified ? (
    <Badge variant="success" title={note ?? "Checked by an admin"} data-testid="verified-badge">
      <ShieldCheck aria-hidden="true" /> Verified
    </Badge>
  ) : (
    <Badge variant="warning" title="We have not checked this company yet. Be careful with personal details and never pay to apply." data-testid="unverified-badge">
      <ShieldAlert aria-hidden="true" /> Not verified
    </Badge>
  );
}
