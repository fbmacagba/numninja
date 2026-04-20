import { getRequestContext } from '@cloudflare/next-on-pages';
import { NextResponse } from 'next/server';
import { verifyPassword, signSessionToken } from '../../../../lib/auth';
import { cookies } from 'next/headers';

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const { env } = getRequestContext();
    const db = (env as any).DB;

    if (!db) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { alias, password } = await request.json();

    if (!alias || !password) {
      return NextResponse.json({ error: 'Missing alias or password' }, { status: 400 });
    }

    const normalizedAlias = alias.trim();

    // Fetch user
    const user = await db.prepare('SELECT id, alias, password_hash FROM users WHERE alias = ? COLLATE NOCASE')
      .bind(normalizedAlias).first();

    if (!user) {
      return NextResponse.json({ error: 'Invalid alias or password' }, { status: 401 });
    }

    // Verify hash
    const isValid = await verifyPassword(password, user.password_hash as string);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid alias or password' }, { status: 401 });
    }

    // Canonical alias from DB (preserve original casing, but ensure no trailing spaces)
    const canonicalAlias = (user.alias as string).trim();

    // Update country on each login so it stays current
    const country = (request as any).cf?.country || request.headers.get('CF-IPCountry') || null;
    if (country) {
      await db.prepare('UPDATE users SET country = ? WHERE id = ?').bind(country, user.id).run();
    }

    // Issue JWT
    const token = await signSessionToken({ id: user.id as number, alias: canonicalAlias });

    cookies().set('numninja_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });

    const adminList = (process.env.ADMIN_ALIASES || '').split(',').map((a) => a.trim().toLowerCase()).filter(Boolean);
    const isAdmin = adminList.includes(canonicalAlias.toLowerCase());

    return NextResponse.json({ success: true, alias: canonicalAlias, isAdmin });
  } catch (error) {
    console.error('Login Error:', error);
    return NextResponse.json({ error: 'Failed to authenticate' }, { status: 500 });
  }
}
