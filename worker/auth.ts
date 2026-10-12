import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { Env } from './index';
import { isValidEmail } from '../shared/validation';

export function isLocalDevelopment(request: Request, env: Env): boolean {
  // Vite replaces DEV with false in every production build. Runtime vars cannot enable it.
  if (import.meta.env?.DEV !== true || env.APP_ENV !== 'local' || env.LOCAL_AUTH !== 'enabled') return false;
  const url = new URL(request.url);
  if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) return false;
  if (request.headers.get('host') && request.headers.get('host') !== url.host) return false;
  // Miniflare injects the loopback peer and Vite injects the original local host.
  // Accept only those exact local values; refuse external peers, tunnels and proxies.
  const peer = request.headers.get('cf-connecting-ip');
  if (peer && !['127.0.0.1', '::1', '[::1]'].includes(peer)) return false;
  const forwardedHost = request.headers.get('x-forwarded-host');
  if (forwardedHost && forwardedHost !== url.host) return false;
  if (['cf-ray', 'forwarded', 'x-forwarded-for', 'x-forwarded-proto', 'x-real-ip'].some(key => request.headers.has(key))) return false;
  return true;
}

export function accessIssuer(env: Env): string | null {
  const team = env.ACCESS_TEAM_DOMAIN?.trim().replace(/^https:\/\//, '').replace(/\/$/, '');
  if (!team || !/^[a-z0-9-]+\.cloudflareaccess\.com$/i.test(team) || !env.ACCESS_AUD?.trim() || !env.OWNER_EMAIL?.trim() || !isValidEmail(env.OWNER_EMAIL.trim())) return null;
  return `https://${team.toLowerCase()}`;
}

const keys = new Map<string, ReturnType<typeof createRemoteJWKSet>>();
export async function authorize(request: Request, env: Env): Promise<boolean> {
  if (isLocalDevelopment(request, env)) return true;
  const issuer = accessIssuer(env);
  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!issuer || !token) return false;
  try {
    let jwks = keys.get(issuer);
    if (!jwks) { jwks = createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`)); keys.set(issuer, jwks); }
    const { payload } = await jwtVerify(token, jwks, {
      issuer, audience: env.ACCESS_AUD!.trim(), algorithms: ['RS256'], requiredClaims: ['exp', 'iat', 'email', 'sub'],
    });
    return typeof payload.email === 'string' && payload.email.toLowerCase() === env.OWNER_EMAIL!.trim().toLowerCase() && payload.type === 'app';
  } catch { return false; }
}
