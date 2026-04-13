import { getRequestContext } from '@cloudflare/next-on-pages';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET() {
  try {
    const { env } = getRequestContext();
    const db = env.DB; // Binding name 'DB'

    if (!db) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { results } = await db.prepare(
      'SELECT alias, score, attempts, timestamp FROM scores ORDER BY score DESC LIMIT 50'
    ).all();

    return NextResponse.json(results);
  } catch (e) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { env } = getRequestContext();
    const db = env.DB;

    if (!db) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { alias, score, attempts, timestamp } = await request.json();

    await db.prepare(
      'INSERT INTO scores (alias, score, attempts, timestamp) VALUES (?, ?, ?, ?)'
    ).bind(alias, score, attempts, timestamp).run();

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
