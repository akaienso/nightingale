export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { uploadPublicBuffer } from '@/lib/s3';
import { enforceRateLimits, getClientIp } from '@/lib/rate-limit';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Human-friendly labels for the report categories the client can send.
const CATEGORY_LABELS: Record<string, string> = {
  bug: 'Bug report',
  incorrect: 'Incorrect translation',
  inappropriate: 'Inappropriate translation',
  unnatural: "Doesn't sound natural / colloquial",
  other: 'Other',
};

const MODE_LABELS: Record<string, string> = {
  panel: 'Translate',
  chat: 'Chat with Olia',
  image: 'Upload / Image translate',
  conversation: 'Live conversation',
};

const escapeHtml = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export async function POST(request: NextRequest) {
  try {
    // Abuse shield: cap reports per IP. Fails open if the datastore is down.
    const ip = getClientIp(request);
    const perHour = parseInt(process.env.REPORT_PER_HOUR || '10', 10);
    const perDay = parseInt(process.env.REPORT_PER_DAY || '40', 10);
    const rl = await enforceRateLimits([
      { identifier: `report:${ip}`, kind: 'hour', limit: perHour },
      { identifier: `report:${ip}`, kind: 'day', limit: perDay },
    ]);
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: 'rate_limited' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
      );
    }

    const data = await request.json().catch(() => ({}));
    const category = (data?.category ?? 'other').toString();
    const description = (data?.description ?? '').toString().trim();
    const email = (data?.email ?? '').toString().trim();
    const mode = (data?.mode ?? '').toString();
    const pageUrl = (data?.url ?? '').toString().slice(0, 500);
    const screenshotBase64 = typeof data?.screenshotBase64 === 'string' ? data.screenshotBase64 : '';

    if (!description) {
      return NextResponse.json({ success: false, error: 'description_required' }, { status: 400 });
    }
    if (email && !EMAIL_RE.test(email)) {
      return NextResponse.json({ success: false, error: 'invalid_email' }, { status: 400 });
    }

    // Identify the reporter (if signed in) for context.
    let reporter = 'Anonymous visitor';
    try {
      const session = await getServerSession(authOptions);
      if (session?.user?.email) {
        reporter = `${session.user.name || 'User'} <${session.user.email}>`;
      }
    } catch {
      /* ignore */
    }

    // Optionally store the screenshot and include a link in the email.
    let screenshotUrl = '';
    if (screenshotBase64) {
      try {
        const match = screenshotBase64.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
        if (match) {
          const contentType = match[1];
          const buffer = Buffer.from(match[2], 'base64');
          // Guard against oversized payloads (~8MB decoded).
          if (buffer.length <= 8 * 1024 * 1024) {
            const ext = contentType.includes('png') ? 'png' : 'jpg';
            const up = await uploadPublicBuffer(buffer, contentType, `report-${Date.now()}.${ext}`);
            screenshotUrl = up.url;
          }
        }
      } catch (e) {
        console.error('Report screenshot upload failed:', e);
        // Non-fatal: continue sending the report without the screenshot.
      }
    }

    const categoryLabel = CATEGORY_LABELS[category] || CATEGORY_LABELS.other;
    const modeLabel = MODE_LABELS[mode] || (mode ? mode : 'Unknown');

    const appUrl = process.env.NEXTAUTH_URL || '';
    const appHost = appUrl ? new URL(appUrl).hostname : 'nightingale.im';

    const safeDescription = escapeHtml(description).replace(/\n/g, '<br/>');
    const safeReporter = escapeHtml(reporter);
    const safeCategory = escapeHtml(categoryLabel);
    const safeMode = escapeHtml(modeLabel);
    const safeUrl = escapeHtml(pageUrl);

    const screenshotBlock = screenshotUrl
      ? `<p style="margin: 10px 0;"><strong>Screenshot:</strong> <a href="${escapeHtml(
          screenshotUrl
        )}">View screenshot</a></p>
         <div style="margin: 12px 0;"><img src="${escapeHtml(
           screenshotUrl
         )}" alt="Report screenshot" style="max-width: 100%; border: 1px solid #ddd; border-radius: 6px;" /></div>`
      : `<p style="margin: 10px 0; color:#888;"><em>No screenshot attached.</em></p>`;

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #1a1a1a;">
        <h2 style="color: #1f2d3d; border-bottom: 2px solid #4a7c59; padding-bottom: 10px;">
          New Content Report
        </h2>
        <p style="color: #555;">A user submitted a report through the Nightingale app.</p>
        <div style="background: #f6f8f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 10px 0;"><strong>Type:</strong> ${safeCategory}</p>
          <p style="margin: 10px 0;"><strong>Screen:</strong> ${safeMode}</p>
          <p style="margin: 10px 0;"><strong>Reporter:</strong> ${safeReporter}</p>
          ${email ? `<p style="margin: 10px 0;"><strong>Contact email:</strong> <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p>` : ''}
          ${safeUrl ? `<p style="margin: 10px 0;"><strong>Page:</strong> ${safeUrl}</p>` : ''}
          <p style="margin: 10px 0;"><strong>Details:</strong></p>
          <div style="background: white; padding: 15px; border-radius: 4px; border-left: 4px solid #4a7c59;">
            ${safeDescription}
          </div>
          ${screenshotBlock}
        </div>
        <p style="color: #888; font-size: 12px;">
          Sent from ${escapeHtml(appHost)} at ${escapeHtml(new Date().toISOString())}.
        </p>
      </div>
    `;

    const recipient = process.env.REPORT_RECIPIENT_EMAIL || 'reports@nightingale.im';

    const response = await fetch('https://apps.abacus.ai/api/sendNotificationEmail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deployment_token: process.env.ABACUSAI_API_KEY,
        app_id: process.env.WEB_APP_ID,
        notification_id: process.env.NOTIF_ID_CONTENT_REPORT,
        subject: `Nightingale report: ${categoryLabel} (${modeLabel})`,
        body: htmlBody,
        is_html: true,
        recipient_email: recipient,
        reply_to: email && EMAIL_RE.test(email) ? email : undefined,
        sender_email: appUrl ? `noreply@${appHost}` : undefined,
        sender_alias: 'Nightingale Reports',
      }),
    });

    const result = await response.json().catch(() => ({}));

    if (!result?.success) {
      if (result?.notification_disabled) {
        // Owner turned this notification off — don't block the user.
        return NextResponse.json({ success: true, screenshotUrl });
      }
      console.error('Content report email failed:', result);
      return NextResponse.json({ success: false, error: 'send_failed' }, { status: 502 });
    }

    return NextResponse.json({ success: true, screenshotUrl });
  } catch (err) {
    console.error('Content report error:', err);
    return NextResponse.json({ success: false, error: 'server_error' }, { status: 500 });
  }
}
