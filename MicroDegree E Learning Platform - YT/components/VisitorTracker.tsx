"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { initVisitorTracking, trackPageView } from "@/lib/visitorTracker";

// Anonymous visitor tracking (see lib/visitorTracker.ts): a page view on every route
// change, plus WhatsApp and sign-up/checkout CTA clicks. Renders nothing. Mounted once in
// the root layout, next to <Analytics />. Does nothing unless the
// NEXT_PUBLIC_TRACKING_SUPABASE_* env vars are set, and never throws.
export default function VisitorTracker() {
  const pathname = usePathname();

  useEffect(() => {
    initVisitorTracking();
  }, []);

  useEffect(() => {
    trackPageView();
  }, [pathname]);

  return null;
}
