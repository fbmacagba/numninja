import { getRequestContext } from '@cloudflare/next-on-pages';
import { NextResponse } from 'next/server';
import { verifySessionToken } from '../../../../lib/auth';
import { cookies } from 'next/headers';

export const runtime = 'edge';

function isAdmin(alias: string): boolean {
  const adminList = (process.env.ADMIN_ALIASES || '').split(',').map((a) => a.trim().toLowerCase()).filter(Boolean);
  return adminList.includes(alias.toLowerCase());
}

export async function GET() {
  try {
    const sessionCookie = cookies().get('numninja_session')?.value;
    if (!sessionCookie) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const session = await verifySessionToken(sessionCookie);
    if (!session || !isAdmin(session.alias)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { env } = getRequestContext();
    const db = (env as any).DB;
    if (!db) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

    const { results } = await db.prepare(
      `SELECT s.alias, u.country, s.score, s.attempts, s.level_reached
       FROM scores s
       LEFT JOIN users u ON u.alias = s.alias COLLATE NOCASE
       ORDER BY s.score DESC
       LIMIT 100`
    ).all();

    return NextResponse.json({ players: results ?? [] });
  } catch (error) {
    console.error('Admin players GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch players' }, { status: 500 });
  }
}
