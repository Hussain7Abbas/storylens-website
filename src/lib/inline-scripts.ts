// The two scripts the static export inlines. Both are hashed into the CSP by
// `deploy/security-headers.ts`, so keep them small, dependency-free and ES5:
// they run before anything else on the page.

/** Applies the saved theme in `<head>`, before the first paint. */
export const themeScript = `try{var t=localStorage.getItem('storylens-theme')||'system';document.documentElement.dataset.theme=t==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):t}catch{}`;

/**
 * Section reveals, in place of a scroll animation library. The document is
 * only marked `data-motion="on"` once the observer exists, so a blocked or
 * failing script leaves every section visible instead of hidden. Reduced
 * motion skips the whole thing, and each element is unobserved once seen.
 */
export const revealScript = `(function(){try{if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;var o=new IntersectionObserver(function(es){for(var i=0;i<es.length;i++){if(es[i].isIntersecting){es[i].target.dataset.reveal='in';o.unobserve(es[i].target)}}},{rootMargin:'0px 0px -6% 0px'});var n=document.querySelectorAll('[data-reveal]');if(!n.length)return;document.documentElement.dataset.motion='on';for(var j=0;j<n.length;j++)o.observe(n[j])}catch(e){document.documentElement.removeAttribute('data-motion')}})()`;
