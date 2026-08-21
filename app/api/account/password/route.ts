import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * POST /api/account/password
 * Sets or changes the authenticated user's password.
 * - If the user already has a password, `currentPassword` is required and must match.
 * - If the user has no password yet (e.g. signed up via Google), they can set one
 *   without providing a current password. This is what lets a Google-only user
 *   establish email/password sign-in before disconnecting Google.
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const userId = (session.user as { id: string }).id;
    const body = await request.json().catch(() => ({}));
    const currentPassword: string = body?.currentPassword || '';
    const newPassword: string = body?.newPassword || '';

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true },
    });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.password) {
      // Changing an existing password requires the current one.
      const valid = currentPassword ? await bcrypt.compare(currentPassword, user.password) : false;
      if (!valid) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
      }
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: userId }, data: { password: hashed } });

    return NextResponse.json({ success: true, hasPassword: true });
  } catch (error: any) {
    console.error('Set password error:', error);
    return NextResponse.json({ error: 'Failed to update password' }, { status: 500 });
  }
}
