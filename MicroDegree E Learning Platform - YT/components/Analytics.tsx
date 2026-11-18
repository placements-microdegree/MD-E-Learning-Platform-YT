import Script from "next/script";

// Google Analytics 4 (gtag.js). This codebase ships to two domains and must send
// each one's hits to its own GA property:
//   - microdegree.in (home + /premium + rest)      -> G-3ZS5NELEE2
//   - microdegree.work/learning (basePath /learning) -> G-NXT05R9647 (shared with
//     the main microdegree.work site's property)
// Every other host — per-deploy *.netlify.app permalinks, localhost — sends nothing.
// The main microdegree.work marketing site is a separate app and is unaffected:
// this app only ever serves the /learning sub-path there.
const GA_BY_HOST: Record<string, string> = {
  "microdegree.in": "G-3ZS5NELEE2",
  "www.microdegree.in": "G-3ZS5NELEE2",
  "microdegree.work": "G-NXT05R9647",
  "www.microdegree.work": "G-NXT05R9647",
};

// Microsoft Clarity — separate project per host, same split as GA above.
// The *.netlify.app permalinks send nothing.
const CLARITY_BY_HOST: Record<string, string> = {
  "microdegree.in": "ykmim9vsum",
  "www.microdegree.in": "ykmim9vsum",
  "microdegree.work": "wknm8tw9ry",
  "www.microdegree.work": "wknm8tw9ry",
};

export default function Analytics() {
  return (
    <>
      <Script id="ga-gtag" strategy="lazyOnload">
        {`
          (function () {
            var ids = ${JSON.stringify(GA_BY_HOST)};
            var id = ids[window.location.hostname];
            if (!id) return;
            var s = document.createElement('script');
            s.async = true;
            s.src = 'https://www.googletagmanager.com/gtag/js?id=' + id;
            document.head.appendChild(s);
            window.dataLayer = window.dataLayer || [];
            function gtag(){window.dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', id);
          })();
        `}
      </Script>
      <Script id="ms-clarity" strategy="lazyOnload">
        {`
          (function () {
            var ids = ${JSON.stringify(CLARITY_BY_HOST)};
            var id = ids[window.location.hostname];
            if (!id) return;
            (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", id);
          })();
        `}
      </Script>
    </>
  );
}
