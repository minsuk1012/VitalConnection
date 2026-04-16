/**
 * POST /api/thumbnail/render
 * body: { layout, headline, ... }
 * → WebP binary 반환
 */
import { NextRequest, NextResponse } from 'next/server'
import os from 'os'
import fs from 'fs'
import path from 'path'
import puppeteer from 'puppeteer-core'
import { checkAdmin } from '@/lib/auth'
import { buildTemplateHtml } from '@/lib/thumbnail'
import { composeHtml, composeSceneHtml } from '@/lib/thumbnail-compose'

export const dynamic = 'force-dynamic'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

async function renderHtmlToWebp(html: string): Promise<Buffer> {
  const tmpPath = path.join(os.tmpdir(), `thumbnail-${Date.now()}-${Math.random().toString(36).slice(2)}.html`)
  fs.writeFileSync(tmpPath, html, 'utf-8')

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 1080, height: 1080, deviceScaleFactor: 1 })
    await page.goto(`file://${tmpPath}`, { waitUntil: 'networkidle0' })
    const screenshot = await page.screenshot({ type: 'webp', quality: 88 }) as Buffer
    await page.close()
    return screenshot
  } finally {
    await browser.close()
    try { fs.unlinkSync(tmpPath) } catch {}
  }
}

export async function POST(request: NextRequest) {
  const authError = await checkAdmin()
  if (authError) return authError

  const body = await request.json()
  const baseUrl = `${request.nextUrl.protocol}//${request.nextUrl.host}`

  try {
    const legacyLayoutTokenId = body.layoutTokenId as string
    const legacyEffectTokenId = body.effectTokenId as string
    const isNewCompose =
      typeof body.sceneTokenId === 'string'
      || (typeof body.layoutTokenId === 'string' && typeof body.effectTokenId === 'string')
    const html = isNewCompose
      ? (typeof body.sceneTokenId === 'string'
          ? composeSceneHtml(body.sceneTokenId, {
              headline: body.headline ?? undefined,
              headlineKo: body.headlineKo ?? undefined,
              subheadline: body.subheadline ?? undefined,
              brandEn: body.brandEn ?? undefined,
              brandKo: body.brandKo ?? undefined,
              price: body.price ?? undefined,
              priceUnit: body.priceUnit ?? undefined,
              model: body.model ?? undefined,
              cutout: body.cutout ?? undefined,
              panelColor: body.panelColor ?? undefined,
              elements: body.elements,
              baseUrl,
            })
          : composeHtml(legacyLayoutTokenId, legacyEffectTokenId, {
              headline: body.headline ?? undefined,
              headlineKo: body.headlineKo ?? undefined,
              subheadline: body.subheadline ?? undefined,
              brandEn: body.brandEn ?? undefined,
              brandKo: body.brandKo ?? undefined,
              price: body.price ?? undefined,
              priceUnit: body.priceUnit ?? undefined,
              model: body.model ?? undefined,
              cutout: body.cutout ?? undefined,
              panelColor: body.panelColor ?? undefined,
              elements: body.elements,
              baseUrl,
            }))
      : (() => {
          const { layout, ...input } = body
          if (!layout) throw new Error('layout 필수')
          return buildTemplateHtml(layout, { ...input, baseUrl })
        })()

    const screenshot = await renderHtmlToWebp(html)
    return new NextResponse(screenshot, {
      headers: {
        'Content-Type': 'image/webp',
        'Content-Disposition': `attachment; filename="${(body.sceneTokenId ?? body.layoutTokenId ?? body.layout ?? 'thumbnail')}-${Date.now()}.webp"`,
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
