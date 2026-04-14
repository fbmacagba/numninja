import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const runtime = 'edge';

export async function POST() {
  try {
    cookies().delete('numninja_session');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout Error:', error);
    return NextResponse.json({ error: 'Failed to log out' }, { status: 500 });
  }
}
