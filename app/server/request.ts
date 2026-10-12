import 'server-only';

// Mutating JSON endpoints accept only same-origin browser requests (CSRF defence alongside SameSite=Lax cookies).
export function isSameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  let originHost: string;
  try { originHost = new URL(origin).host; } catch { return false; }
  const allowed = new Set([request.headers.get('host'), request.headers.get('x-forwarded-host')].filter(Boolean));
  if (process.env.APP_URL) { try { allowed.add(new URL(process.env.APP_URL).host); } catch { /* ignore malformed APP_URL */ } }
  return allowed.has(originHost);
}

// X-Forwarded-For entries left of our own proxies are client-controlled, so the address is read from the right:
// TRUSTED_PROXY_COUNT (default 1) is how many proxies in front of the app append to the header.
// Rate limits that matter for security (per-account login) never rely on this value alone.
export function clientIp(headers: Headers) {
  const hops = (headers.get('x-forwarded-for') ?? '').split(',').map(part => part.trim()).filter(Boolean);
  const trusted = Math.max(1, Number(process.env.TRUSTED_PROXY_COUNT) || 1);
  return hops[hops.length - trusted] ?? hops[0] ?? headers.get('x-real-ip') ?? 'local';
}

export const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
