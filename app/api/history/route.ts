import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as { id: string }).id;
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = 20;

    const [translations, total] = await Promise.all([
      prisma.translationHistory.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.translationHistory.count({ where: { userId } }),
    ]);

    return NextResponse.json({ translations, total, pages: Math.ceil(total / limit) });
  } catch (error: any) {
    console.error('History GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as { id: string }).id;
    const body = await request.json();

    const entry = await prisma.translationHistory.create({
      data: {
        userId,
        sourceText: body.sourceText || '',
        translation: body.translation || '',
        culturalNote: body.culturalNote || null,
        direction: body.direction || 'en-to-ua',
        dialect: body.dialect || 'western',
        englishDialect: body.englishDialect || 'american',
        formality: body.formality || 'informal',
        outputFormat: body.outputFormat || 'conversational',
        mode: body.mode || 'panel',
      },
    });

    return NextResponse.json({ success: true, id: entry.id });
  } catch (error: any) {
    console.error('History POST error:', error);
    return NextResponse.json({ error: 'Failed to save translation' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as { id: string }).id;
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (id) {
      await prisma.translationHistory.deleteMany({ where: { id, userId } });
    } else {
      await prisma.translationHistory.deleteMany({ where: { userId } });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('History DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
