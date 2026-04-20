import { getRequestContext } from '@cloudflare/next-on-pages';
import { NextResponse } from 'next/server';
import { hashPassword, signSessionToken } from '../../../../lib/auth';
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

    if (!alias || !password || alias.length < 3 || password.length < 4) {
      return NextResponse.json({ error: 'Invalid alias or password length' }, { status: 400 });
    }

    const normalizedAlias = alias.trim();

    // Check if alias exists (using NOCASE collection in DB handles casing)
    const existing = await db.prepare('SELECT id FROM users WHERE alias = ?')
      .bind(normalizedAlias).first();

    if (existing) {
      return NextResponse.json({ error: 'Alias already exists' }, { status: 409 });
    }

    // Hash and insert
    const passwordHash = await hashPassword(password);
    const country = (request as any).cf?.country || request.headers.get('CF-IPCountry') || null;
    const result = await db.prepare(
      'INSERT INTO users (alias, password_hash, country) VALUES (?, ?, ?)'
    ).bind(normalizedAlias, passwordHash, country).run();

    const newId = result.meta.last_row_id;

    // Issue JWT
    const token = await signSessionToken({ id: newId, alias: normalizedAlias });
    
    cookies().set('numninja_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });

    return NextResponse.json({ success: true, alias: normalizedAlias });
  } catch (error) {
    console.error('Register Error:', error);
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
  }
}
