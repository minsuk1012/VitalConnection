/**
 * GET /api/thumbnail/preview?layout=&headline=&...
 * 에디터 iframe용 — HTML 문자열 반환
 */
import { NextRequest, NextResponse } from 'next/server'
import { checkAdmin } from '@/lib/auth'
import { buildTemplateHtml } from '@/lib/thumbnail'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const authError = await checkAdmin()
  if (authError) return authError

  const s = request.nextUrl.searchParams
  const layout = s.get('layout')
  if (!layout) return new NextResponse('layout 필수', { status: 400 })

  const baseUrl = `${request.nextUrl.protocol}//${request.nextUrl.host}`

  try {
    const html = buildTemplateHtml(layout, {
      headline:    s.get('headline')   ?? undefined,
      subheadline: s.get('sub')        ?? undefined,
      brandEn:     s.get('brandEn')    ?? undefined,
      brandKo:     s.get('brandKo')    ?? undefined,
      tagline:     s.get('tagline')    ?? undefined,
      badge:       s.get('badge')      ?? undefined,
      price:       s.get('price')      ?? undefined,
      priceUnit:   s.get('priceUnit')  ?? undefined,
      model:       s.get('model')      ?? undefined,
      cutout:      s.get('cutout')     ?? undefined,
      baseUrl,
    })
    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  } catch (e: any) {
    return new NextResponse(e.message, { status: 500 })
  }
}
