import { getRequestContext } from '@cloudflare/next-on-pages';
import { NextResponse } from 'next/server';
import { verifySessionToken } from '../../../lib/auth';
import { cookies } from 'next/headers';

export const runtime = 'edge';

const VALID_CATEGORIES = ['bug', 'suggestion', 'praise', 'other'];

export async function POST(request: Request) {
  try {
    const { env } = getRequestContext();
    const db = (env as any).DB;
    if (!db) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

    const body = await request.json();
    const { message, rating, category } = body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }
    if (message.length > 1000) {
      return NextResponse.json({ error: 'Message too long (max 1000 chars)' }, { status: 400 });
    }

    let alias: string | null = null;
    const sessionCookie = cookies().get('numninja_session')?.value;
    if (sessionCookie) {
      const session = await verifySessionToken(sessionCookie);
      if (session) alias = session.alias;
    }

    const ratingVal = typeof rating === 'number' && rating >= 1 && rating <= 5 ? rating : null;
    const categoryVal = VALID_CATEGORIES.includes(category) ? category : 'other';

    await db.prepare(
      `INSERT INTO feedback (alias, message, rating, category, created_at)
       VALUES (?, ?, ?, ?, datetime('now'))`
    ).bind(alias, message.trim(), ratingVal, categoryVal).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Feedback POST Error:', error);
    return NextResponse.json({ error: 'Failed to submit feedback' }, { status: 500 });
  }
}
