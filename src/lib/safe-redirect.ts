/**
 * Validate a post-login redirect target. Rejects anything that:
 *  - isn't a same-origin path starting with `/`
 *  - is a protocol-relative URL (`//evil.com`) or contains a scheme
 *  - points to an auth/public-only route (login, signup, /)
 *  - matches an explicit forbidden prefix
 *
 * Falls back to `fallback` (default `/app`) when invalid.
 */
const FORBIDDEN_EXACT = new Set<string>(["/login", "/signup", "/onboarding"]);
const FORBIDDEN_PREFIXES = ["/client/"]; // public client portal — never a post-login destination

export function safeRedirectTarget(raw: string | null | undefined, fallback = "/app"): string {
  if (!raw || typeof raw !== "string") return fallback;
  const trimmed = raw.trim();
  if (!trimmed) return fallback;

  // Must be a relative path; reject schemes, protocol-relative, and backslashes
  if (!trimmed.startsWith("/")) return fallback;
  if (trimmed.startsWith("//") || trimmed.startsWith("/\\")) return fallback;
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return fallback;

  // Parse against current origin to drop anything that isn't a clean pathname
  let url: URL;
  try {
    url = new URL(trimmed, window.location.origin);
  } catch {
    return fallback;
  }
  if (url.origin !== window.location.origin) return fallback;

  const path = url.pathname;
  if (path === "/" || FORBIDDEN_EXACT.has(path)) return fallback;
  if (FORBIDDEN_PREFIXES.some((p) => path.startsWith(p))) return fallback;

  return path + url.search + url.hash;
}

const STORAGE_KEY = "post_login_redirect";

export function readStoredRedirect(): string | null {
  try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
}

export function persistRedirect(target: string) {
  try { localStorage.setItem(STORAGE_KEY, target); } catch { /* ignore */ }
}

export function clearStoredRedirect() {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}

/** Resolve the best available redirect target, validated and falling back safely. */
export function resolveRedirect(rawFromQuery?: string | null, fallback = "/app"): string {
  return safeRedirectTarget(rawFromQuery || readStoredRedirect() || fallback, fallback);
}