function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  get graphyApiKey() {
    return requireEnv("GRAPHY_API_KEY");
  },
  /** Where the generic "Enroll Now" SSO redirect lands post-login -  the learner's active courses/dashboard. */
  get graphyDashboardUrl() {
    return requireEnv("GRAPHY_DASHBOARD_URL");
  },
  /** Paid course bundle checkout (Razorpay via Graphy). Update GRAPHY_COURSE_CHECKOUT_URL when the bundle changes. */
  get graphyCourseCheckoutUrl() {
    return requireEnv("GRAPHY_COURSE_CHECKOUT_URL");
  },
  /** Free course link used by the "Start Learning for Free" plan. */
  get graphyFreeCourseUrl() {
    return requireEnv("GRAPHY_FREE_COURSE_URL");
  },
  /** /e-learning page: its own paid checkout (same UI/plan layout, different Graphy membership). */
  get graphyELearningCheckoutUrl() {
    return requireEnv("GRAPHY_E_LEARNING_CHECKOUT_URL");
  },
  /** /e-learning page: its own free course link. */
  get graphyELearningFreeCourseUrl() {
    return requireEnv("GRAPHY_E_LEARNING_FREE_COURSE_URL");
  },
  /** /tech-courses page (organic traffic): its own paid checkout. */
  get graphyOrganicCheckoutUrl() {
    return requireEnv("GRAPHY_ORGANIC_CHECKOUT_URL");
  },
  /** /tech-courses page (organic traffic): its own free course link. */
  get graphyOrganicFreeCourseUrl() {
    return requireEnv("GRAPHY_ORGANIC_FREE_COURSE_URL");
  },
  /** Refer & earn link used by the referral section CTA. */
  get graphyReferralUrl() {
    return requireEnv("GRAPHY_REFERRAL_URL");
  },
  /** Canonical public origin (e.g. https://microdegree.in). Auth redirects must be pinned to this, never derived from request.url -  Netlify serves every deploy at a per-deploy *.netlify.app permalink too, and request.url's origin can resolve to that instead of the custom domain. */
  get siteUrl() {
    return requireEnv("NEXT_PUBLIC_SITE_URL");
  },
  get supabaseUrl() {
    return requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  },
  get supabaseAnonKey() {
    return requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  },
  /** Server-only. Bypasses RLS -  never expose to the client or use outside lib/supabase/admin.ts. */
  get supabaseServiceRoleKey() {
    return requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  },
  /** Shared secret we append to the Graphy webhook URL (?secret=...) since Graphy's webhook config has no header/signing option. */
  get graphyWebhookSecret() {
    return requireEnv("GRAPHY_WEBHOOK_SECRET");
  },
  /**
   * Graphy membership ids parsed out of the checkout links (.../checkout/V4/membership/<id>/pN).
   * Lets the transaction webhook tell a plan purchase apart from a standalone course purchase -
   * both arrive as "Success Transaction", only the membership one should touch graphy_memberships.
   * Read straight off process.env (not the throwing getters) so a missing link just yields undefined.
   */
  get graphyMembershipIds(): { free: string[]; paid: string[] } {
    const parse = (url?: string) => url?.match(/membership\/([a-z0-9]+)/i)?.[1];
    const ids = (...urls: Array<string | undefined>) => urls.map(parse).filter(Boolean) as string[];
    return {
      free: ids(process.env.GRAPHY_FREE_COURSE_URL, process.env.GRAPHY_E_LEARNING_FREE_COURSE_URL, process.env.GRAPHY_ORGANIC_FREE_COURSE_URL),
      paid: ids(process.env.GRAPHY_COURSE_CHECKOUT_URL, process.env.GRAPHY_E_LEARNING_CHECKOUT_URL, process.env.GRAPHY_ORGANIC_CHECKOUT_URL),
    };
  },
  /** LeadSquared -> Settings -> API code generation. Used to push graphy_leads rows into the CRM. */
  get leadSquaredAccessKey() {
    return requireEnv("LEADSQUARED_ACCESS_KEY");
  },
  get leadSquaredSecretKey() {
    return requireEnv("LEADSQUARED_SECRET_KEY");
  },
  /** Region/cluster-specific API host shown alongside the keys on the same LeadSquared settings page -  NOT the generic api.leadsquared.com for every account (e.g. api-in21.leadsquared.com). */
  get leadSquaredApiHost() {
    return requireEnv("LEADSQUARED_API_HOST");
  },
  /**
   * Shared secret we choose ourselves, appended as ?secret=... to app/api/cron/sync-leads-to-lsq's
   * URL. Authorizes the scheduled GitHub Actions workflow (.github/workflows/sync-leads-to-lsq.yml)
   * to trigger that endpoint -  same env var name (LEADSQUARED_WEBHOOK_SECRET) as when this used to
   * protect a real-time Supabase Database Webhook receiver, kept as-is to avoid re-adding it in
   * Netlify; the getter name below just reflects what it actually guards now.
   */
  get leadSquaredSyncSecret() {
    return requireEnv("LEADSQUARED_WEBHOOK_SECRET");
  },
};
