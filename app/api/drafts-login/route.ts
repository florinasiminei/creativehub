import { NextResponse } from 'next/server';
import { verifyDraftCredentials } from '@/lib/draftsAuth';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const username = String(body?.username || '').trim();
    const password = String(body?.password || '');

    const verified = verifyDraftCredentials(username, password);
    if (!verified) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true, role: verified.role });
    response.cookies.set('drafts_auth', verified.encoded, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    });
    return response;
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 });
  }
}
