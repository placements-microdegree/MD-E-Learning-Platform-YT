"use client";

import { useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { asset } from "@/lib/assetPath";
import styles from "./LoginForm.module.css";

type Mode = "sign-in" | "sign-up";

export default function LoginForm({
  next,
  initialError,
  returnUrl,
}: {
  next: string;
  initialError?: string;
  returnUrl?: string;
}) {
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    initialError === "auth" ? "That sign-in link didn't work. Please try again." : null,
  );
  const [info, setInfo] = useState<string | null>(null);

  const returnUrlSuffix = returnUrl ? `&returnurl=${encodeURIComponent(returnUrl)}` : "";
  // window.location navigation doesn't get basePath applied, so prefix it explicitly.
  const ssoRedirectPath = asset(`/api/graphy-sso?next=${next}${returnUrlSuffix}`);
  // Pinned to the canonical domain, never window.location.origin -  Netlify also serves this app at a
  // per-deploy *.netlify.app permalink, and we don't want that leaking into the OAuth redirect.
  const callbackUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=${next}${returnUrlSuffix}`;

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);

    try {
      const supabase = createClient();

      if (mode === "sign-in") {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          setError(signInError.message);
          setLoading(false);
          return;
        }
        window.location.href = ssoRedirectPath;
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: callbackUrl },
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      if (data.session) {
        window.location.href = ssoRedirectPath;
        return;
      }

      setInfo("Check your email to confirm your account, then come back and sign in.");
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: callbackUrl },
      });
      if (oauthError) {
        setError(oauthError.message);
        setLoading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <Image
          src={asset("/images/NewMicroDegree-RIIDL-Logo.f91e4da6cca73c99835c.webp")}
          alt="MicroDegree"
          width={460}
          height={83}
          className={styles.logo}
          preload
        />
        <h1 className={styles.heading}>{mode === "sign-in" ? "Welcome back" : "Create your account"}</h1>
        <p className={styles.subheading}>Sign in to continue to your MicroDegree dashboard.</p>

        <div className={styles.tabs}>
          <button
            type="button"
            className={`${styles.tab} ${mode === "sign-in" ? styles.tabActive : ""}`}
            onClick={() => setMode("sign-in")}
          >
            Sign in
          </button>
          <button
            type="button"
            className={`${styles.tab} ${mode === "sign-up" ? styles.tabActive : ""}`}
            onClick={() => setMode("sign-up")}
          >
            Sign up
          </button>
        </div>

        {error && <div className={`${styles.message} ${styles.error}`}>{error}</div>}
        {info && <div className={`${styles.message} ${styles.success}`}>{info}</div>}

        <form onSubmit={handlePasswordSubmit}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              className={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
              className={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" className={styles.submit} disabled={loading}>
            {loading ? "Please wait..." : mode === "sign-in" ? "Sign in" : "Create account"}
          </button>
        </form>

        <div className={styles.divider}>or</div>

        <button type="button" className={styles.google} onClick={handleGoogle} disabled={loading}>
          <GoogleIcon />
          Continue with Google
        </button>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.95v2.33A9 9 0 0 0 9 18z"
      />
      <path fill="#FBBC05" d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.95A9 9 0 0 0 0 9c0 1.45.35 2.83.95 4.05z" />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .95 4.95l3.02 2.33C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  );
}
