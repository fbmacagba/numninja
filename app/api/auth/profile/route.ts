import { getRequestContext } from '@cloudflare/next-on-pages';
import { NextResponse } from 'next/server';
import { verifySessionToken, verifyPassword, hashPassword, signSessionToken } from '../../../../lib/auth';
import { cookies } from 'next/headers';

export const runtime = 'edge';

export async function PUT(request: Request) {
  try {
    const sessionCookie = cookies().get('numninja_session')?.value;
    if (!sessionCookie) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const session = await verifySessionToken(sessionCookie);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { env } = getRequestContext();
    const db = (env as any).DB;
    if (!db) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Current and new password are required' }, { status: 400 });
    }
    if (newPassword.length < 4) {
      return NextResponse.json({ error: 'New password must be at least 4 characters' }, { status: 400 });
    }
    if (newPassword.length > 128) {
      return NextResponse.json({ error: 'Password too long' }, { status: 400 });
    }

    const user = await db.prepare('SELECT id, password_hash FROM users WHERE alias = ? COLLATE NOCASE')
      .bind(session.alias).first();

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const valid = await verifyPassword(currentPassword, user.password_hash as string);
    if (!valid) return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 });

    const newHash = await hashPassword(newPassword);
    await db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(newHash, user.id).run();

    // Re-issue session cookie so it stays fresh
    const token = await signSessionToken({ id: user.id as number, alias: session.alias });
    cookies().set('numninja_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Profile PUT Error:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
