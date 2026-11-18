import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

// Set as the "Log Out URL" in Graphy -> Integrations -> Third Party Single Sign On,
// so a Graphy logout also ends the Supabase session here and lands on our own homepage
// instead of learning.microdegree.work.
export async function GET() {
  const supabase = await createClient();
  await supabase.auth.signOut();

  // Pinned to the canonical origin (which includes the basePath when served under
  // microdegree.work/learning), never request.url — behind the proxy that resolves
  // to the internal origin host.
  return NextResponse.redirect(`${env.siteUrl}/`);
}
