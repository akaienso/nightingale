// Transactional email via Cloudflare Email Sending (REST API).
//
// Replaces the Abacus notification-email service, which died with the Abacus
// account. The three public forms — website contact, tutoring inquiry, and
// content report — are the only senders.
//
// Docs: https://developers.cloudflare.com/email-service/
//
// Two field-name traps worth knowing, because they fail silently rather than
// loudly: the REST API takes `from.address` (the *Workers binding* spells it
// `from.email`), and `reply_to` in snake_case (the binding uses `replyTo`).

const CF_API = 'https://api.cloudflare.com/client/v4';

/**
 * Mail domain for both the sender and the default recipient mailboxes.
 *
 * This is deliberately NOT derived from `NEXTAUTH_URL`. The app runs on a
 * subdomain (app.<domain>) while mail is sent from and delivered to the apex —
 * and only the apex is onboarded to Cloudflare Email Sending. Deriving the
 * sender from the app host would try to send as `noreply@app.<domain>`, an
 * unverified domain, and every send would be rejected.
 */
export function mailDomain(): string {
  return process.env.MAIL_DOMAIN || 'nightingale.im';
}

/** Default mailbox on the mail domain, overridable per-route by env. */
export function mailbox(local: string, override?: string): string {
  const v = (override || '').trim();
  return v || `${local}@${mailDomain()}`;
}

export interface SendEmailArgs {
  to: string;
  subject: string;
  html: string;
  /**
   * Plain-text alternative. Required, not optional: some clients only render
   * text, and a missing text part measurably hurts spam scoring. That matters
   * here because the new sending domain starts with no reputation.
   */
  text: string;
  replyTo?: string;
  /** Display name on the From address. */
  fromName?: string;
}

export type SendEmailResult =
  | { ok: true }
  | { ok: false; reason: 'bounced' | 'rejected' | 'misconfigured' | 'network'; detail?: string };

/**
 * Send one transactional email.
 *
 * There is deliberately no "notifications disabled" mute switch. These forms
 * are the only channel users have to reach a human, so they always attempt to
 * send, and a failure is surfaced as a failure rather than reported as success.
 */
export async function sendEmail(args: SendEmailArgs): Promise<SendEmailResult> {
  const accountId = process.env.CF_ACCOUNT_ID;
  const token = process.env.CF_EMAIL_API_TOKEN;
  if (!accountId || !token) {
    // Distinguish a bad deploy from a bad address — otherwise a missing env var
    // looks identical to a bounce in the logs.
    return { ok: false, reason: 'misconfigured', detail: 'CF_ACCOUNT_ID or CF_EMAIL_API_TOKEN not set' };
  }

  const from = process.env.MAIL_FROM || `noreply@${mailDomain()}`;
  const fromName = args.fromName || process.env.MAIL_FROM_NAME || 'Nightingale';

  const body: Record<string, any> = {
    to: args.to,
    from: { address: from, name: fromName },
    subject: args.subject,
    html: args.html,
    text: args.text,
  };
  if (args.replyTo) body.reply_to = args.replyTo;

  let res: Response;
  try {
    res = await fetch(`${CF_API}/accounts/${accountId}/email/sending/send`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    return { ok: false, reason: 'network', detail: String(err) };
  }

  const payload = await res.json().catch(() => ({} as any));

  if (!res.ok) {
    const errs = Array.isArray(payload?.errors)
      ? payload.errors.map((e: any) => `${e?.code ?? ''} ${e?.message ?? ''}`.trim()).join('; ')
      : '';
    return { ok: false, reason: 'rejected', detail: errs || `HTTP ${res.status}` };
  }

  // The send outcome sits under `result` in the standard Cloudflare API
  // envelope; tolerate a bare object too, in case the envelope is skipped.
  const result = payload?.result ?? payload;
  const bounced: string[] = Array.isArray(result?.permanent_bounces) ? result.permanent_bounces : [];
  if (bounced.length) {
    return { ok: false, reason: 'bounced', detail: bounced.join(', ') };
  }

  if (payload?.success === false) {
    return { ok: false, reason: 'rejected', detail: JSON.stringify(payload?.errors ?? {}) };
  }

  return { ok: true };
}

/**
 * Collapse an HTML fragment to a readable plain-text alternative.
 *
 * The three form bodies are small, hand-built templates, so a full HTML parser
 * is unwarranted — this only has to handle the tags those templates use.
 */
export function htmlToText(html: string): string {
  return html
    .replace(/<\s*(br|\/p|\/div|\/h[1-6])\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/[ \t]+/g, ' ')
    // Trim each line BEFORE collapsing blank runs — trimming whitespace-only
    // lines is what turns them into blank lines in the first place.
    .split('\n')
    .map((l) => l.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
