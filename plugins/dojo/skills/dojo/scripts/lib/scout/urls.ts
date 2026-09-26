// URL canonicalisation and the drop rules. Two mentions of one resource must land on the same
// key, so the rules are deterministic and conservative: https, lowercase host without www,
// no fragment, no tracking parameters, no trailing slash, and one form for YouTube videos.

export interface Canonical {
  url: string;
  domain: string;
}

const DROP_HOST_PATTERNS: RegExp[] = [
  /(^|\.)reddit\.com$/,
  /(^|\.)redd\.it$/,
  /(^|\.)redditmedia\.com$/,
  /(^|\.)redditstatic\.com$/,
  /(^|\.)reddithelp\.com$/,
  /(^|\.)redditinc\.com$/,
  /(^|\.)imgur\.com$/,
  /(^|\.)giphy\.com$/,
  /(^|\.)gyazo\.com$/,
  /(^|\.)prnt\.sc$/,
  /(^|\.)tenor\.com$/,
  /(^|\.)gravatar\.com$/,
  /(^|\.)twitter\.com$/,
  /^x\.com$/,
  /(^|\.)t\.co$/,
  /(^|\.)facebook\.com$/,
  /(^|\.)fb\.com$/,
  /(^|\.)fb\.me$/,
  /(^|\.)instagram\.com$/,
  /(^|\.)tiktok\.com$/,
  /(^|\.)linkedin\.com$/,
  /(^|\.)lnkd\.in$/,
  /(^|\.)threads\.net$/,
  /(^|\.)bsky\.app$/,
  /(^|\.)mastodon\.social$/,
  /(^|\.)discord\.com$/,
  /(^|\.)discord\.gg$/,
  /(^|\.)t\.me$/,
  /(^|\.)telegram\.me$/,
  /(^|\.)snapchat\.com$/,
  /(^|\.)pinterest\.com$/,
  /(^|\.)news\.ycombinator\.com$/,
  /(^|\.)patreon\.com$/,
  /(^|\.)paypal\.(com|me)$/,
  /(^|\.)ko-fi\.com$/,
  /(^|\.)buymeacoffee\.com$/,
  /(^|\.)opencollective\.com$/,
  /^localhost$/,
];

const MEDIA_EXTENSION_RE = /\.(png|jpe?g|gif|webp|svg|bmp|ico|mp4|webm|mov|mp3|wav|avif)$/i;

/** Hosts whose bare root is a platform, not a resource. */
const PLATFORM_ROOTS = new Set([
  'github.com',
  'gitlab.com',
  'youtube.com',
  'google.com',
  'wikipedia.org',
  'en.wikipedia.org',
  'npmjs.com',
  'medium.com',
  'dev.to',
  'udemy.com',
  'stackoverflow.com',
  'stackexchange.com',
  'twitch.tv',
  'amazon.com',
  'web.archive.org',
  'archive.org',
  'coursera.org',
  'edx.org',
  'substack.com',
  'hashnode.dev',
  'codepen.io',
  'jsfiddle.net',
  'codesandbox.io',
  'replit.com',
  'glitch.com',
  'vercel.app',
  'netlify.app',
  'herokuapp.com',
  'pages.dev',
]);

const TRACKING_PARAMS = new Set([
  'fbclid',
  'gclid',
  'dclid',
  'msclkid',
  'yclid',
  'mc_cid',
  'mc_eid',
  'ref',
  'ref_src',
  'ref_url',
  'referrer',
  'referral',
  'source',
  'igshid',
  '_ga',
  '_gl',
  'trk',
  'cmpid',
  'affcode',
  'aff_id',
  'affiliate_id',
  'affiliate',
  'sk',
  'share',
]);

const GITHUB_RESERVED = new Set([
  'orgs',
  'topics',
  'sponsors',
  'features',
  'marketplace',
  'settings',
  'login',
  'join',
  'explore',
  'trending',
  'about',
  'pricing',
  'search',
  'collections',
  'events',
  'site',
  'security',
  'contact',
  'apps',
  'readme',
  'notifications',
  'issues',
  'pulls',
  'new',
  'organizations',
  'enterprise',
  'team',
  'customer-stories',
  'blog',
]);

function isTracking(name: string): boolean {
  const n = name.toLowerCase();
  return n.startsWith('utm_') || TRACKING_PARAMS.has(n);
}

/** Unwraps redirector and archive URLs to the page they point at. */
function unwrap(u: URL): URL | null {
  const host = u.hostname.toLowerCase();
  if (host === 'web.archive.org') {
    const m = u.href.match(/^https?:\/\/web\.archive\.org\/web\/\d{1,14}[a-z_]*\/(https?:\/\/.+)$/i);
    if (m) return safeUrl(m[1]);
    return null;
  }
  if ((host === 'google.com' || host === 'www.google.com') && u.pathname === '/url') {
    const q = u.searchParams.get('q') ?? u.searchParams.get('url');
    return q ? safeUrl(q) : null;
  }
  if ((host === 'youtube.com' || host === 'www.youtube.com') && u.pathname === '/redirect') {
    const q = u.searchParams.get('q');
    return q ? safeUrl(q) : null;
  }
  return u;
}

function safeUrl(raw: string): URL | null {
  try {
    return new URL(raw);
  } catch {
    return null;
  }
}

function normaliseHost(host: string): string {
  let h = host.toLowerCase().replace(/\.$/, '');
  h = h.replace(/^(www|www\d|m|mobile|amp)\./, '');
  h = h.replace(/\.m\.wikipedia\.org$/, '.wikipedia.org');
  if (h === 'music.youtube.com' || h === 'youtube-nocookie.com' || h === 'm.youtube.com') h = 'youtube.com';
  return h;
}

function youtubeForm(host: string, pathname: string, params: URLSearchParams): { path: string; params: URLSearchParams } | null {
  const out = new URLSearchParams();
  if (host === 'youtu.be') {
    const id = pathname.split('/').filter(Boolean)[0];
    if (!id) return null;
    out.set('v', id);
    return { path: '/watch', params: out };
  }
  const idFromPath = pathname.match(/^\/(?:embed|v|shorts|live)\/([A-Za-z0-9_-]{6,})/);
  if (idFromPath) {
    out.set('v', idFromPath[1]);
    return { path: '/watch', params: out };
  }
  if (pathname === '/watch') {
    const v = params.get('v');
    if (!v) return null;
    out.set('v', v);
    return { path: '/watch', params: out };
  }
  if (pathname === '/playlist') {
    const list = params.get('list');
    if (!list) return null;
    out.set('list', list);
    return { path: '/playlist', params: out };
  }
  return { path: pathname, params: out };
}

/**
 * Canonical form of a URL, or null when the link is not a resource (reddit, images, social
 * links, platform roots) or cannot be parsed.
 */
export function canonicalise(raw: string): Canonical | null {
  const parsed = safeUrl(raw.trim());
  if (!parsed) return null;
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
  const u = unwrap(parsed);
  if (!u) return null;
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;

  let host = normaliseHost(u.hostname);
  if (!host || !host.includes('.')) return null;
  if (DROP_HOST_PATTERNS.some((re) => re.test(host))) return null;

  let path = u.pathname.replace(/\/{2,}/g, '/');
  let params = new URLSearchParams(u.search);

  if (host === 'youtube.com' || host === 'youtu.be') {
    const yt = youtubeForm(host, path, params);
    if (!yt) return null;
    host = 'youtube.com';
    path = yt.path;
    params = yt.params;
  } else if (host === 'github.com' || host === 'raw.githubusercontent.com') {
    path = path.toLowerCase().replace(/\.git$/, '');
    if (path.startsWith('/sponsors/')) return null;
    path = path.replace(/^(\/[^/]+\/[^/]+)\/(?:blob|tree)\/[^/]+(?:\/readme(?:\.md|\.rst|\.txt)?)?\/?$/, '$1');
    params = new URLSearchParams();
  } else if (/(^|\.)amazon\.[a-z.]+$/.test(host) || host === 'amzn.to') {
    const asin = path.match(/\/dp\/([A-Z0-9]{10})/i) ?? path.match(/\/gp\/product\/([A-Z0-9]{10})/i);
    if (asin) path = `/dp/${asin[1].toUpperCase()}`;
    else path = path.replace(/\/ref=.*$/, '');
    params = new URLSearchParams();
  } else if (host === 'google.com' && path === '/search') {
    return null;
  } else {
    const kept = new URLSearchParams();
    const names = [...new Set([...params.keys()])].filter((n) => !isTracking(n)).sort();
    for (const n of names) {
      const v = params.get(n);
      if (v !== null) kept.set(n, v);
    }
    params = kept;
  }

  if (MEDIA_EXTENSION_RE.test(path)) return null;
  path = path.replace(/\/index\.html?$/i, '/');
  path = path.replace(/\/+$/, '');
  if (path === '' && PLATFORM_ROOTS.has(host)) return null;
  if (host === 'github.com' && path.split('/').filter(Boolean).length === 1) {
    const first = path.split('/')[1];
    if (GITHUB_RESERVED.has(first)) return null;
  }

  const query = params.toString();
  const url = `https://${host}${path}${query ? `?${query}` : ''}`;
  return { url, domain: host };
}

/** The owner and repository of a canonical github.com URL, or null. */
export function githubRepo(canonicalUrl: string): { owner: string; repo: string } | null {
  const m = canonicalUrl.match(/^https:\/\/(?:github\.com|raw\.githubusercontent\.com)\/([a-z0-9_.-]+)\/([a-z0-9_.-]+)(?:\/|$)/);
  if (!m) return null;
  if (GITHUB_RESERVED.has(m[1])) return null;
  return { owner: m[1], repo: m[2] };
}

/** The video id of a canonical youtube.com/watch URL, or null. */
export function youtubeId(canonicalUrl: string): string | null {
  const m = canonicalUrl.match(/^https:\/\/youtube\.com\/watch\?v=([A-Za-z0-9_-]+)$/);
  return m ? m[1] : null;
}

/** host plus path and query without the scheme, for text matching and HN lookups. */
export function urlStem(canonicalUrl: string): string {
  return canonicalUrl.replace(/^https:\/\//, '');
}
