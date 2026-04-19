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
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    return NextResponse.json({ alias: session.alias, isAdmin: isAdmin(session.alias) });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
