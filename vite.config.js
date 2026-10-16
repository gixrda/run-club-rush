// BASE_PATH: sub-path of the host (GitHub Pages project site: '/run-club-rush/'); '/' by default.
// GitHub Pages cannot send response headers, so the production build embeds the CSP as a <meta> tag
// (same policy as public/_headers, minus the directives browsers ignore in <meta>: frame-ancestors).
const CSP = [
  "default-src 'self'", "script-src 'self'", "style-src 'self'", "img-src 'self' data:", "font-src 'self'",
  "connect-src 'self'", "media-src 'self'", "object-src 'none'", "base-uri 'self'", "form-action 'none'",
  'upgrade-insecure-requests',
].join('; ');

export default {
  base: process.env.BASE_PATH || '/',
  plugins: [{
    name: 'security-meta',
    apply: 'build',
    transformIndexHtml: () => [
      { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP }, injectTo: 'head-prepend' },
      { tag: 'meta', attrs: { name: 'referrer', content: 'no-referrer' }, injectTo: 'head-prepend' },
    ],
  }],
};
