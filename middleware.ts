import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const maintenanceEnabled = process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'false'

  const isOnMaintenancePage = request.nextUrl.pathname.startsWith('/maintenance')
  const isStaticAsset = request.nextUrl.pathname.includes('.') // skip static files like .css, .js

  if (maintenanceEnabled && !isOnMaintenancePage && !isStaticAsset) {
    return NextResponse.redirect(new URL('/maintenance', request.url))
  }

  return NextResponse.next()
}
