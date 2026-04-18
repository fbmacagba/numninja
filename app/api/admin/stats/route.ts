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

    const [players, scores, feedback] = await Promise.all([
      db.prepare('SELECT COUNT(*) as total FROM users').first(),
      db.prepare('SELECT COUNT(*) as total, AVG(score) as avg_score, MAX(score) as top_score, AVG(level_reached) as avg_level FROM scores').first(),
      db.prepare('SELECT COUNT(*) as total, AVG(rating) as avg_rating FROM feedback').first(),
    ]);

    const categoryBreakdown = await db.prepare(
      'SELECT category, COUNT(*) as count FROM feedback GROUP BY category ORDER BY count DESC'
    ).all();

    const ratingBreakdown = await db.prepare(
      'SELECT rating, COUNT(*) as count FROM feedback WHERE rating IS NOT NULL GROUP BY rating ORDER BY rating DESC'
    ).all();

    return NextResponse.json({
      players: { total: players?.total ?? 0 },
      scores: {
        total: scores?.total ?? 0,
        avg_score: Math.round((scores?.avg_score as number) || 0),
        top_score: scores?.top_score ?? 0,
        avg_level: Math.round(((scores?.avg_level as number) || 0) * 10) / 10,
      },
      feedback: {
        total: feedback?.total ?? 0,
        avg_rating: Math.round(((feedback?.avg_rating as number) || 0) * 10) / 10,
        by_category: categoryBreakdown?.results ?? [],
        by_rating: ratingBreakdown?.results ?? [],
      },
    });
  } catch (error) {
    console.error('Admin stats GET Error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
