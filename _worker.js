/**
 * Sign-in gate for this Cloudflare Pages site (Pages "advanced mode" worker).
 *
 * Every request must carry a valid Cloudflare Access token. The token's signature,
 * issuer, audience and expiry are checked here against your Zero Trust team's
 * public keys, so the site stays closed even if the Access application in front
 * of it is removed or misconfigured, and the *.pages.dev addresses stay closed.
 *
 * Set these on the Pages project (Settings > Variables and Secrets, Production):
 *   CF_ACCESS_TEAM_DOMAIN  https://<your-team>.cloudflareaccess.com
 *   CF_ACCESS_AUD          Application Audience (AUD) tag of the Access application.
 *                          Separate several tags with commas.
 * Until both are set, every page returns 503 and nothing is served.
 */

const SECURITY_HEADERS = {
  "Content-Security-Policy":
    "default-src 'self'; img-src 'self' data:; " +
    "style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; " +
    "script-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
};

const KEYS_TTL_MS = 60 * 60 * 1000; // reuse fetched signing keys for an hour
const MIN_REFETCH_MS = 30 * 1000; // refetch for an unknown key id at most every 30 s
const CLOCK_SKEW_S = 60;

let keyCache = { url: "", keys: new Map(), fetchedAt: 0 };

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/robots.txt") {
      return plain(200, "User-agent: *\nDisallow: /\n");
    }

    const team = normalizeTeamDomain(env.CF_ACCESS_TEAM_DOMAIN);
    const audiences = String(env.CF_ACCESS_AUD || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!team || audiences.length === 0) {
      return notice(503, "Not available yet", "Sign-in has not been set up for this site.");
    }

    const token =
      request.headers.get("Cf-Access-Jwt-Assertion") || readCookie(request, "CF_Authorization");
    if (!token) {
      return notice(403, "Sign-in required", "Open the site at its main address to sign in.");
    }

    try {
      await verifyAccessToken(token, team, audiences);
    } catch {
      return notice(403, "Sign-in could not be verified", "Close this tab, then open the site again to sign in.");
    }

    const asset = await env.ASSETS.fetch(request);
    const response = new Response(asset.body, asset);
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) response.headers.set(name, value);
    response.headers.set("Cache-Control", "private, no-cache");
    return response;
  },
};

async function verifyAccessToken(token, team, audiences) {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("malformed token");
  const header = JSON.parse(base64UrlToString(parts[0]));
  const payload = JSON.parse(base64UrlToString(parts[1]));
  if (header.alg !== "RS256" || !header.kid) throw new Error("unexpected algorithm");

  const key = await signingKey(team, header.kid);
  const valid = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    base64UrlToBytes(parts[2]),
    new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
  );
  if (!valid) throw new Error("bad signature");

  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== "number" || payload.exp + CLOCK_SKEW_S < now) throw new Error("expired");
  if (typeof payload.nbf === "number" && payload.nbf - CLOCK_SKEW_S > now) throw new Error("not yet valid");
  if (payload.iss !== team) throw new Error("wrong issuer");
  const tokenAudiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!tokenAudiences.some((aud) => audiences.includes(aud))) throw new Error("wrong audience");
  return payload;
}

async function signingKey(team, kid) {
  const url = `${team}/cdn-cgi/access/certs`;
  const age = Date.now() - keyCache.fetchedAt;
  const stale = keyCache.url !== url || age > KEYS_TTL_MS;
  const unknownKid = !keyCache.keys.has(kid) && age > MIN_REFETCH_MS;
  if (stale || unknownKid) await loadKeys(url);
  const key = keyCache.keys.get(kid);
  if (!key) throw new Error("unknown signing key");
  return key;
}

async function loadKeys(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`could not load signing keys (${res.status})`);
  const { keys = [] } = await res.json();
  const imported = new Map();
  for (const jwk of keys) {
    if (jwk.kty !== "RSA" || !jwk.kid) continue;
    imported.set(
      jwk.kid,
      await crypto.subtle.importKey(
        "jwk",
        { kty: "RSA", n: jwk.n, e: jwk.e, alg: "RS256", ext: true },
        { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
        false,
        ["verify"],
      ),
    );
  }
  keyCache = { url, keys: imported, fetchedAt: Date.now() };
}

function normalizeTeamDomain(value) {
  let domain = String(value || "").trim().replace(/\/+$/, "");
  if (!domain) return "";
  if (!/^https:\/\//i.test(domain)) domain = `https://${domain.replace(/^http:\/\//i, "")}`;
  return domain;
}

function readCookie(request, name) {
  const cookies = request.headers.get("Cookie") || "";
  for (const part of cookies.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return "";
}

function base64UrlToBytes(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function base64UrlToString(value) {
  return new TextDecoder().decode(base64UrlToBytes(value));
}

function plain(status, body) {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}

function notice(status, title, message) {
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow"><title>${title}</title>
<style>
:root{color-scheme:light dark}
body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;
font:16px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;background:#F2F4F5;color:#15212B}
main{max-width:28rem;display:grid;gap:8px}
h1{font-size:1.4rem;margin:0}
p{margin:0;color:#56636E}
small{margin-top:16px;color:#56636E;font-size:.8rem}
@media (prefers-color-scheme: dark){body{background:#0E151B;color:#E3E9ED}p,small{color:#9BA9B4}}
</style></head>
<body><main><h1>${title}</h1><p>${message}</p>
<small>A Sepsis Initiative · Educational resource only. No duty of care.</small></main></body></html>`;
  return new Response(html, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Content-Security-Policy":
        "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "no-referrer",
    },
  });
}
