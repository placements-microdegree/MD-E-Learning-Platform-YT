import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

// Google OAuth redirects here with a `code`; we exchange it for a Supabase session,
// then hand off to /api/graphy-sso to log the user into Graphy.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "dashboard";
  const returnurl = searchParams.get("returnurl");
  const returnUrlSuffix = returnurl ? `&returnurl=${encodeURIComponent(returnurl)}` : "";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${env.siteUrl}/api/graphy-sso?next=${next}${returnUrlSuffix}`);
    }
  }

  return NextResponse.redirect(`${env.siteUrl}/login?next=${next}&error=auth${returnUrlSuffix}`);
}
