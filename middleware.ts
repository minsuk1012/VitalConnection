import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const hasSession = request.cookies.has('admin_session')

  // 세션 없으면 → 로그인 페이지로
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login') && !pathname.startsWith('/admin/logout')) {
    if (!hasSession) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  }

  // 세션 있으면 → 로그인 페이지 접근 차단, 대시보드로
  if (pathname === '/admin/login' && hasSession) {
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  // pathname을 헤더로 전달 (레이아웃에서 경로 기반 조건 처리용)
  const response = NextResponse.next()
  response.headers.set('x-pathname', pathname)
  return response
}

export const config = {
  matcher: ['/admin/:path*'],
}
