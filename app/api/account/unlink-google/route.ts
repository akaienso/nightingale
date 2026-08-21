import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * POST /api/account/unlink-google
 * Disconnects the Google sign-in method from the authenticated user's account.
 * Guarded: refuses to unlink unless the user has a password set, otherwise they
 * would be locked out of their account entirely.
 */
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const userId = (session.user as { id: string }).id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true, accounts: { select: { id: true, provider: true } } },
    });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const googleAccounts = (user.accounts ?? []).filter((a) => a.provider === 'google');
    if (googleAccounts.length === 0) {
      return NextResponse.json({ error: 'Google is not connected' }, { status: 400 });
    }
    if (!user.password) {
      return NextResponse.json(
        { error: 'Set a password first so you can still sign in after disconnecting Google.' },
        { status: 400 },
      );
    }

    await prisma.account.deleteMany({ where: { userId, provider: 'google' } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Unlink Google error:', error);
    return NextResponse.json({ error: 'Failed to disconnect Google' }, { status: 500 });
  }
}
