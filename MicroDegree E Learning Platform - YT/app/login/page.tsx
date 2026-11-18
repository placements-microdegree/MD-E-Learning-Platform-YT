import type { Metadata } from "next";
import { redirect } from "next/navigation";
import LoginForm from "@/components/LoginForm";
import { asset } from "@/lib/assetPath";
import { env } from "@/lib/env";
import { socialMeta } from "@/lib/seo";

const TITLE = "Log in | MicroDegree";
const DESCRIPTION = "Log in to your MicroDegree dashboard to continue learning Cloud, DevOps and GenAI in Kannada.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  robots: { index: false, follow: false },
  ...socialMeta({ title: TITLE, description: DESCRIPTION, path: "/login" }),
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; returnurl?: string }>;
}) {
  const { next = "dashboard", error, returnurl } = await searchParams;

  // Auth lives on Graphy for now. If Graphy bounced someone here (e.g. their Graphy session
  // expired mid-course, so it sent them to our configured "Log In URL" with a returnurl), don't
  // dead-end them on a Supabase form they may have no account for — hand straight to the SSO
  // endpoint, which routes them to that Graphy page and lets Graphy handle its own login.
  if (returnurl) {
    const ssoPath = asset(
      `/api/graphy-sso?next=${encodeURIComponent(next)}&returnurl=${encodeURIComponent(returnurl)}`,
    );
    let target = ssoPath;
    try {
      target = new URL(ssoPath, env.siteUrl).toString();
    } catch {
      // env.siteUrl missing — fall back to the (basePath-prefixed) relative path
    }
    redirect(target);
  }

  return (
    <main>
      <LoginForm next={next} initialError={error} returnUrl={returnurl} />
    </main>
  );
}
