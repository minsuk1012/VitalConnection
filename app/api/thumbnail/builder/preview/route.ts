// app/api/thumbnail/builder/preview/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { checkAdmin } from '@/lib/auth'
import { composeHtml } from '@/lib/thumbnail-compose'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const authError = await checkAdmin()
  if (authError) return authError

  const s = req.nextUrl.searchParams
  const layoutToken = s.get('layoutToken')
  const effectToken = s.get('effectToken')
  if (!layoutToken || !effectToken) {
    return new NextResponse('layoutToken, effectToken 필수', { status: 400 })
  }

  const baseUrl = `${req.nextUrl.protocol}//${req.nextUrl.host}`

  try {
    const html = composeHtml(layoutToken, effectToken, {
      headline:    s.get('headline')    ?? undefined,
      headlineKo:  s.get('headlineKo')  ?? undefined,
      subheadline: s.get('sub')         ?? undefined,
      brandEn:     s.get('brandEn')     ?? undefined,
      brandKo:     s.get('brandKo')     ?? undefined,
      price:       s.get('price')       ?? undefined,
      model:       s.get('model')       ?? undefined,
      cutout:      s.get('cutout')      ?? undefined,
      fontFamily:  s.get('fontFamily')  ?? undefined,
      accentColor: s.get('accentColor') ?? undefined,
      panelColor:  s.get('panelColor')  ?? undefined,
      textColor:   s.get('textColor')   ?? undefined,
      subColor:    s.get('subColor')    ?? undefined,
      baseUrl,
    })
    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  } catch (e: any) {
    return new NextResponse(e.message, { status: 500 })
  }
}
