import type { ReactNode } from "react";

// The CSV import's server action creates invoices one transaction at a time
// (about 5 s each). Vercel's default limit can cut it off midway, so give this
// page's server actions 60 s, the same as /demo.
export const maxDuration = 60;

export default function DistribuidorLayout({ children }: { children: ReactNode }) {
  return children;
}
