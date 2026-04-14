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

export const dynamic = 'force-dynamic'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

export async function POST(request: NextRequest) {
  const authError = await checkAdmin()
  if (authError) return authError

  const body = await request.json()
  const { layout, ...input } = body
  if (!layout) return NextResponse.json({ error: 'layout 필수' }, { status: 400 })

  const baseUrl = `${request.nextUrl.protocol}//${request.nextUrl.host}`

  try {
    const html = buildTemplateHtml(layout, { ...input, baseUrl })

    // 임시 HTML 파일 저장
    const tmpPath = path.join(os.tmpdir(), `thumbnail-${Date.now()}.html`)
    fs.writeFileSync(tmpPath, html, 'utf-8')

    const browser = await puppeteer.launch({
      executablePath: CHROME,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })

    const page = await browser.newPage()
    await page.setViewport({ width: 1080, height: 1080, deviceScaleFactor: 1 })
    await page.goto(`file://${tmpPath}`, { waitUntil: 'networkidle0' })

    const screenshot = await page.screenshot({ type: 'webp', quality: 88 }) as Buffer

    await page.close()
    await browser.close()
    fs.unlinkSync(tmpPath)

    return new NextResponse(screenshot, {
      headers: {
        'Content-Type': 'image/webp',
        'Content-Disposition': `attachment; filename="${layout}-${Date.now()}.webp"`,
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
