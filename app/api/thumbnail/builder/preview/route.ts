// app/api/thumbnail/builder/preview/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { checkAdmin } from '@/lib/auth'
import { composeHtml, composeSceneHtml } from '@/lib/thumbnail-compose'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const authError = await checkAdmin()
  if (authError) return authError

  const s = req.nextUrl.searchParams
  const sceneTokenId = s.get('sceneTokenId')
  const layoutToken = s.get('layoutToken')
  const effectToken = s.get('effectToken')
  if (!sceneTokenId && (!layoutToken || !effectToken)) {
    return new NextResponse('sceneTokenId 또는 layoutToken, effectToken 필수', { status: 400 })
  }
  const legacyLayoutToken = layoutToken as string
  const legacyEffectToken = effectToken as string

  const baseUrl = `${req.nextUrl.protocol}//${req.nextUrl.host}`

  const elementsParam = s.get('elements')
  const elements = elementsParam ? JSON.parse(elementsParam) : undefined

  try {
    const html = sceneTokenId
      ? composeSceneHtml(sceneTokenId, {
          headline:    s.get('headline')    ?? undefined,
          headlineKo:  s.get('headlineKo')  ?? undefined,
          subheadline: s.get('sub')         ?? undefined,
          brandEn:     s.get('brandEn')     ?? undefined,
          brandKo:     s.get('brandKo')     ?? undefined,
          price:       s.get('price')       ?? undefined,
          model:       s.get('model')       ?? undefined,
          cutout:      s.get('cutout')      ?? undefined,
          panelColor:  s.get('panelColor')  ?? undefined,
          elements,
          baseUrl,
      })
      : composeHtml(legacyLayoutToken, legacyEffectToken, {
          headline:    s.get('headline')    ?? undefined,
          headlineKo:  s.get('headlineKo')  ?? undefined,
          subheadline: s.get('sub')         ?? undefined,
          brandEn:     s.get('brandEn')     ?? undefined,
          brandKo:     s.get('brandKo')     ?? undefined,
          price:       s.get('price')       ?? undefined,
          model:       s.get('model')       ?? undefined,
          cutout:      s.get('cutout')      ?? undefined,
          panelColor:  s.get('panelColor')  ?? undefined,
          elements,
          baseUrl,
        })
    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  } catch (e: any) {
    return new NextResponse(e.message, { status: 500 })
  }
}
