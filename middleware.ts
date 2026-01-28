import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const maintenanceEnabled = process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'true'
  const pathname = request.nextUrl.pathname

  const isOnMaintenancePage = pathname.startsWith('/maintenance')
  const isStaticAsset = pathname.includes('.') // skip static files like .css, .js

  if (maintenanceEnabled && !isOnMaintenancePage && !isStaticAsset) {
    return NextResponse.redirect(new URL('/maintenance', request.url))
  }

  const isDrafts = pathname === '/drafts' || pathname.startsWith('/drafts/')
  if (isDrafts) {
    const adminUser = process.env.DRAFTS_BASIC_USER || 'admin'
    const adminPass = process.env.DRAFTS_BASIC_PASS || 'Parola123*'
    const credentials = `${adminUser}:${adminPass}`
    const encoded =
      typeof btoa !== 'undefined'
        ? btoa(credentials)
        : Buffer.from(credentials).toString('base64')

    const authHeader = request.headers.get('authorization')
    const authCookie = request.cookies.get('drafts_auth')?.value
    const hasValidAuth = authHeader === `Basic ${encoded}` || authCookie === encoded

    if (!hasValidAuth) {
      return new NextResponse('Authentication required.', {
        status: 401,
        headers: { 'WWW-Authenticate': 'Basic realm="Drafts Admin"' },
      })
    }

    const response = NextResponse.next()
    if (authHeader === `Basic ${encoded}` && authCookie !== encoded) {
      // Remember device so the browser doesn't prompt every time.
      response.cookies.set('drafts_auth', encoded, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 30,
        path: '/drafts',
      })
    }
    return response
  }

  return NextResponse.next()
}
