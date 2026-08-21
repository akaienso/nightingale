import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/account
 * Returns the authenticated user's editable profile fields.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const userId = (session.user as { id: string }).id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        preferredName: true,
        bio: true,
        settings: true,
        email: true,
        password: true,
        accounts: { select: { provider: true } },
      },
    });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const providers = Array.from(new Set((user.accounts ?? []).map((a) => a.provider)));
    return NextResponse.json({
      name: user.name ?? '',
      preferredName: user.preferredName ?? '',
      bio: user.bio ?? '',
      settings: user.settings ?? null,
      email: user.email,
      hasPassword: !!user.password,
      providers,
    });
  } catch (error: any) {
    console.error('Account fetch error:', error);
    return NextResponse.json({ error: 'Failed to load profile' }, { status: 500 });
  }
}

/**
 * PATCH /api/account
 * Updates the authenticated user's profile: display name, preferred chat name, and bio.
 */
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const userId = (session.user as { id: string }).id;
    const body = await request.json().catch(() => ({}));

    const data: { name?: string | null; preferredName?: string | null; bio?: string | null; settings?: any } = {};

    if (typeof body?.name === 'string') {
      const v = body.name.trim();
      data.name = v.length ? v.slice(0, 120) : null;
    }
    if (typeof body?.preferredName === 'string') {
      const v = body.preferredName.trim();
      data.preferredName = v.length ? v.slice(0, 60) : null;
    }
    if (typeof body?.bio === 'string') {
      const v = body.bio.trim();
      data.bio = v.length ? v.slice(0, 2000) : null;
    }
    // Translation/UI preferences (the settings drawer controls). Whitelist known
    // keys so arbitrary data can't be stored, then persist as a JSON blob.
    if (body?.settings && typeof body.settings === 'object' && !Array.isArray(body.settings)) {
      const s = body.settings as Record<string, unknown>;
      const allowedStr = ['dialect', 'englishDialect', 'speakerGender', 'addresseeGender', 'formality', 'outputFormat', 'messageFormat', 'direction', 'enterKeyTranslate', 'enterKeyChat', 'uiLang'];
      const clean: Record<string, unknown> = {};
      for (const k of allowedStr) {
        if (typeof s[k] === 'string') clean[k] = (s[k] as string).slice(0, 40);
      }
      if (typeof s.englishVarietyChosen === 'boolean') clean.englishVarietyChosen = s.englishVarietyChosen;
      if (typeof s.emojis === 'boolean') clean.emojis = s.emojis;
      data.settings = clean;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No valid fields provided' }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: { name: true, preferredName: true, bio: true, settings: true },
    });

    return NextResponse.json({
      success: true,
      name: user.name ?? '',
      preferredName: user.preferredName ?? '',
      bio: user.bio ?? '',
      settings: user.settings ?? null,
    });
  } catch (error: any) {
    console.error('Account update error:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}

/**
 * DELETE /api/account
 * Permanently deletes the authenticated user's account and all associated data
 * (accounts, sessions, translation history — all cascade-deleted via Prisma schema).
 */
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;

    // Delete user — cascade removes all related records
    await prisma.user.delete({ where: { id: userId } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Account deletion error:', error);
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }
}
