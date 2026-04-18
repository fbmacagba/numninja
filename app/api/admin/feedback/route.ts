import { getRequestContext } from '@cloudflare/next-on-pages';
import { NextResponse } from 'next/server';
import { verifySessionToken } from '../../../../lib/auth';
import { cookies } from 'next/headers';

export const runtime = 'edge';

function isAdmin(alias: string): boolean {
  const adminList = (process.env.ADMIN_ALIASES || '').split(',').map((a) => a.trim().toLowerCase()).filter(Boolean);
  return adminList.includes(alias.toLowerCase());
}

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const minRating = searchParams.get('minRating');
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500);
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = 'SELECT id, alias, message, rating, category, created_at FROM feedback WHERE 1=1';
    const bindings: (string | number)[] = [];

    if (category && category !== 'all') {
      query += ' AND category = ?';
      bindings.push(category);
    }
    if (minRating) {
      query += ' AND rating >= ?';
      bindings.push(parseInt(minRating));
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    bindings.push(limit, offset);

    const { results } = await db.prepare(query).bind(...bindings).all();

    const countQuery = 'SELECT COUNT(*) as total FROM feedback';
    const countRow = await db.prepare(countQuery).first();

    return NextResponse.json({ feedback: results || [], total: countRow?.total ?? 0 });
  } catch (error) {
    console.error('Admin feedback GET Error:', error);
    return NextResponse.json({ error: 'Failed to fetch feedback' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
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

    const { id } = await request.json();
    if (!id || typeof id !== 'number') {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    await db.prepare('DELETE FROM feedback WHERE id = ?').bind(id).run();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin feedback DELETE Error:', error);
    return NextResponse.json({ error: 'Failed to delete feedback' }, { status: 500 });
  }
}
