import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { UTM_COOKIE, UTM_COOKIE_MAX_AGE, extractUtm, serializeUtmCookie } from "@/lib/utm";

// Keeps the Supabase auth cookie fresh on every request, per @supabase/ssr's Next.js pattern.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  await supabase.auth.getUser();

  // Remember the campaign that brought this visitor (last touch wins) for the Graphy handoff.
  const utm = extractUtm(request.nextUrl.searchParams);
  if (utm.utm_source) {
    response.cookies.set(UTM_COOKIE, serializeUtmCookie(utm), {
      maxAge: UTM_COOKIE_MAX_AGE,
      path: "/",
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images/).*)"],
};
