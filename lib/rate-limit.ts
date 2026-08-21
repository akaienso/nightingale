import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * Cost-protection shield.
 *
 * A lightweight, database-backed rate limiter that caps how many expensive
 * LLM calls a single visitor can make in a rolling time window. It runs BEFORE
 * the model is ever called, so a runaway client (a hot mic, a bot, a script)
 * gets stopped before it can burn through translation credits.
 *
 * This is intentionally independent of the (future) subscription tiers: guests
 * are capped by IP address, signed-in users by account id. When paid tiers land
 * we simply raise/override the per-user limits — nothing here needs to change.
 */

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

// --- Tunable limits (safe defaults; override via .env without a code change) ---
export const LIMITS = {
  // Unauthenticated visitors, capped by IP. Conservative safety valve.
  guestPerHour: () => envInt('GUEST_TRANSLATE_PER_HOUR', 30),
  guestPerDay: () => envInt('GUEST_TRANSLATE_PER_DAY', 150),
  // Signed-in users. These are abuse ceilings only (not the product cap yet);
  // they will be tuned to match Free / Plus / Pro tiers later.
  userPerDay: () => envInt('USER_TRANSLATE_PER_DAY', 600),
  // Image / document translation is heavier, so a tighter per-user daily cap.
  userImagePerDay: () => envInt('USER_IMAGE_PER_DAY', 100),
  // Chat with Olia.
  userChatPerDay: () => envInt('USER_CHAT_PER_DAY', 400),
};

type WindowKind = 'hour' | 'day';

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/** Deterministic UTC bucket key + expiry + seconds until the window resets. */
function windowMeta(kind: WindowKind): { suffix: string; expiresAt: Date; retryAfterSeconds: number } {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = pad(now.getUTCMonth() + 1);
  const d = pad(now.getUTCDate());

  if (kind === 'hour') {
    const h = pad(now.getUTCHours());
    const next = new Date(Date.UTC(y, now.getUTCMonth(), now.getUTCDate(), now.getUTCHours() + 1, 0, 0, 0));
    return {
      suffix: `h:${y}${m}${d}${h}`,
      expiresAt: next,
      retryAfterSeconds: Math.max(1, Math.ceil((next.getTime() - now.getTime()) / 1000)),
    };
  }
  const next = new Date(Date.UTC(y, now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0));
  return {
    suffix: `d:${y}${m}${d}`,
    expiresAt: next,
    retryAfterSeconds: Math.max(1, Math.ceil((next.getTime() - now.getTime()) / 1000)),
  };
}

/** Best-effort client IP extraction from proxy headers. */
export function getClientIp(request: NextRequest): string {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  return (
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    'unknown'
  );
}

export interface RateRule {
  identifier: string; // e.g. "guest:1.2.3.4" or "user:abc123"
  kind: WindowKind;
  limit: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  retryAfterSeconds: number;
}

/**
 * Atomically increments each rule's counter and returns blocked if ANY rule is
 * exceeded. Counting the blocked attempt itself is intentional — it keeps an
 * abuser pinned at the ceiling instead of letting them retry for free.
 *
 * Fails OPEN: if the datastore is unreachable we allow the request rather than
 * take the whole app down over the shield.
 */
export async function enforceRateLimits(rules: RateRule[]): Promise<RateLimitResult> {
  try {
    for (const rule of rules) {
      const { suffix, expiresAt, retryAfterSeconds } = windowMeta(rule.kind);
      const bucketKey = `${rule.identifier}|${suffix}`;
      const rec = await prisma.rateLimit.upsert({
        where: { bucketKey },
        create: { bucketKey, count: 1, expiresAt },
        update: { count: { increment: 1 } },
      });
      if (rec.count > rule.limit) {
        return { allowed: false, limit: rule.limit, retryAfterSeconds };
      }
    }
    return { allowed: true, limit: 0, retryAfterSeconds: 0 };
  } catch (err) {
    // Fail open: never let the shield itself break translation.
    console.error('[rate-limit] check failed, allowing request:', err);
    return { allowed: true, limit: 0, retryAfterSeconds: 0 };
  }
}

/** Standard 429 response body + headers for a blocked request. */
export function rateLimitedResponse(result: RateLimitResult, opts?: { guest?: boolean }): Response {
  const guest = opts?.guest ?? false;
  const mins = Math.ceil(result.retryAfterSeconds / 60);
  const waitText =
    result.retryAfterSeconds >= 3600
      ? `${Math.ceil(result.retryAfterSeconds / 3600)} hour(s)`
      : `${mins} minute(s)`;
  const message = guest
    ? `You've reached the free usage limit for now. Please create a free account for more, or try again in about ${waitText}.`
    : `You've reached your usage limit for now. Please try again in about ${waitText}.`;
  return new Response(
    JSON.stringify({ error: message, rateLimited: true, retryAfterSeconds: result.retryAfterSeconds }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(result.retryAfterSeconds),
      },
    }
  );
}
