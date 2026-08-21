export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const name = (data?.name ?? '').toString().trim();
    const email = (data?.email ?? '').toString().trim();
    const message = (data?.message ?? '').toString().trim();

    // Server-side validation
    if (!name) {
      return NextResponse.json({ success: false, error: 'name_required' }, { status: 400 });
    }
    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json({ success: false, error: 'invalid_email' }, { status: 400 });
    }

    const escapeHtml = (s: string) =>
      s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safeMessage = message ? escapeHtml(message).replace(/\n/g, '<br/>') : '<em>(no message provided)</em>';

    const appUrl = process.env.NEXTAUTH_URL || '';
    const appHost = appUrl ? new URL(appUrl).hostname : 'nightingale.im';

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
        <h2 style="color: #1f2d3d; border-bottom: 2px solid #4a7c59; padding-bottom: 10px;">
          New Tutoring Inquiry 🇺🇦
        </h2>
        <p style="color: #555;">Someone is interested in learning Ukrainian with you through Nightingale.</p>
        <div style="background: #f6f8f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 10px 0;"><strong>Name:</strong> ${safeName}</p>
          <p style="margin: 10px 0;"><strong>Email:</strong> <a href="mailto:${safeEmail}">${safeEmail}</a></p>
          <p style="margin: 10px 0;"><strong>Message:</strong></p>
          <div style="background: white; padding: 15px; border-radius: 4px; border-left: 4px solid #4a7c59;">
            ${safeMessage}
          </div>
        </div>
        <p style="color: #888; font-size: 12px;">
          Sent from ${appHost} — Reply directly to this email to respond to ${safeName}.
        </p>
      </div>
    `;

    const response = await fetch('https://apps.abacus.ai/api/sendNotificationEmail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deployment_token: process.env.ABACUSAI_API_KEY,
        app_id: process.env.WEB_APP_ID,
        notification_id: process.env.NOTIF_ID_TUTORING_INQUIRY,
        subject: `New tutoring inquiry from ${name}`,
        body: htmlBody,
        is_html: true,
        recipient_email: 'olia@nightingale.im',
        reply_to: email,
        sender_email: appUrl ? `noreply@${appHost}` : undefined,
        sender_alias: 'Nightingale',
      }),
    });

    const result = await response.json().catch(() => ({}));

    if (!result?.success) {
      if (result?.notification_disabled) {
        // Owner turned notifications off — treat as success so the visitor isn't blocked.
        return NextResponse.json({ success: true });
      }
      console.error('Tutoring inquiry email failed:', result);
      return NextResponse.json({ success: false, error: 'send_failed' }, { status: 502 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Tutoring inquiry error:', err);
    return NextResponse.json({ success: false, error: 'server_error' }, { status: 500 });
  }
}
