// Prefixes a root-absolute path (image, favicon, internal API route hit from the client)
// with the deployment's basePath.
//
// `next/link` and `next/router` apply basePath automatically, but `next/image` src,
// plain <a href> / <img src>, CSS backgrounds and client-side `window.location` do not.
// Route those through `asset()` so they resolve correctly when the app is served under
// microdegree.work/learning (NEXT_PUBLIC_BASE_PATH=/learning) as well as at the root.
//
// NEXT_PUBLIC_* vars are inlined at build time, so this is safe in both server and client code.
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

export function asset(path: string): string {
  if (!path.startsWith("/")) return path;
  return `${BASE_PATH}${path}`;
}
