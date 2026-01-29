import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getDraftAuthFromHeader, getRoleFromEncodedAuth } from '@/lib/draftsAuth'

export function middleware(request: NextRequest) {
  const maintenanceEnabled = process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'true'
  const pathname = request.nextUrl.pathname

  const isOnMaintenancePage = pathname.startsWith('/maintenance')
  const isStaticAsset = pathname.includes('.') // skip static files like .css, .js

  if (maintenanceEnabled && !isOnMaintenancePage && !isStaticAsset) {
    return NextResponse.redirect(new URL('/maintenance', request.url))
  }

  const isDrafts = pathname === '/drafts' || pathname.startsWith('/drafts/')
  const isDraftsLogin = pathname === '/drafts-login'
  const isDraftsLoginApi = pathname === '/api/drafts-login'
  if (isDraftsLogin || isDraftsLoginApi) {
    return NextResponse.next()
  }
  if (isDrafts) {
    const authHeader = request.headers.get('authorization')
    const authCookie = request.cookies.get('drafts_auth')?.value || null
    const headerAuth = getDraftAuthFromHeader(authHeader)
    const cookieRole = getRoleFromEncodedAuth(authCookie)
    const role = headerAuth?.role || cookieRole
    const encoded = headerAuth?.encoded || authCookie

    if (!role || !encoded) {
      const hasAttempt = !!authHeader || !!authCookie
      const loginUrl = new URL(`/drafts-login${hasAttempt ? '?error=1' : ''}`, request.url)
      const response = NextResponse.redirect(loginUrl)
      if (authCookie) {
        response.cookies.set('drafts_auth', '', {
          httpOnly: true,
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
          maxAge: 0,
          path: '/',
        })
      }
      return response
    }

    const response = NextResponse.next()
    if (headerAuth && authCookie !== encoded) {
      // Remember device so the browser doesn't prompt every time.
      response.cookies.set('drafts_auth', encoded, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 30,
        path: '/',
      })
    }
    return response
  }

  return NextResponse.next()
}
