import { NextResponse } from 'next/server';
import { verifyDraftCredentials, createDraftSession, DRAFT_SESSION_MAX_AGE } from '@/lib/draftsAuth';
import { rateLimit } from '@/lib/rateLimit';

function isSameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  const expected = new URL(request.url);
  const host = request.headers.get('host');
  if (host) expected.host = host;
  return origin === expected.origin;
}

export async function POST(req: Request) {
  try {
    if (!isSameOrigin(req)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const limit = rateLimit(req, { windowMs: 60_000, max: 10, keyPrefix: 'drafts-login' });
    if (!limit.ok) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } });
    }

    const body = await req.json().catch(() => ({}));
    const username = String(body?.username || '').trim();
    const password = String(body?.password || '');

    const verified = verifyDraftCredentials(username, password);
    if (!verified) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true, role: verified.role });
    response.headers.set('Cache-Control', 'private, no-store');
    response.cookies.set('drafts_auth', await createDraftSession(verified), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: DRAFT_SESSION_MAX_AGE,
      path: '/',
    });
    return response;
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: 'Autentificarea nu a putut fi finalizata.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const response = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'private, no-store' } });
  response.cookies.set('drafts_auth', '', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 0, path: '/' });
  return response;
}
