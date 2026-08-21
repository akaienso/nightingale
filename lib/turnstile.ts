/**
 * Server-side Cloudflare Turnstile token verification.
 */

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export async function verifyTurnstileToken(token: string | undefined | null): Promise<boolean> {
  // If no secret key is configured, skip verification (dev environment).
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    console.warn('TURNSTILE_SECRET_KEY not set — skipping Turnstile verification');
    return true;
  }

  if (!token) {
    // In non-production environments (dev/test), allow requests without a token
    // since the Turnstile widget may not render on localhost.
    if (process.env.NODE_ENV !== 'production') {
      // Dev/test mode: Turnstile widget doesn't render on localhost
      return true;
    }
    return false;
  }

  try {
    const res = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token }),
    });
    const data = await res.json();
    if (!data.success && process.env.NODE_ENV !== 'production') {
      console.warn('Turnstile verification failed in non-production — allowing:', data);
      return true;
    }
    return data.success === true;
  } catch (err) {
    console.error('Turnstile verification error:', err);
    return process.env.NODE_ENV !== 'production';
  }
}
