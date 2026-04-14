import { NextRequest, NextResponse } from 'next/server'
import { checkAdmin } from '@/lib/auth'
import { composeHtml } from '@/lib/thumbnail-compose'
import puppeteer from 'puppeteer-core'
import os from 'os'
import path from 'path'
import fs from 'fs'

export const dynamic = 'force-dynamic'

const CHROME =
  process.env.PUPPETEER_EXECUTABLE_PATH ??
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

export async function POST(req: NextRequest) {
  const authError = await checkAdmin()
  if (authError) return authError

  const {
    layoutTokenId,
    effectTokenId,
    headline, subheadline, brandEn, brandKo, price, priceUnit,
    model, cutout,
    fontFamily, accentColor, panelColor,
    sessionId,
    lang,
  } = await req.json()

  if (!layoutTokenId || !effectTokenId) {
    return NextResponse.json({ error: 'layoutTokenId, effectTokenId 필수' }, { status: 400 })
  }

  const baseUrl = `${req.nextUrl.protocol}//${req.nextUrl.host}`

  try {
    const html = composeHtml(layoutTokenId, effectTokenId, {
      headline, subheadline, brandEn, brandKo, price, priceUnit,
      model, cutout, baseUrl, fontFamily, accentColor, panelColor,
    })

    const tmpFile = path.join(os.tmpdir(), `builder-${Date.now()}.html`)
    fs.writeFileSync(tmpFile, html, 'utf-8')

    const browser = await puppeteer.launch({
      executablePath: CHROME,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })
    const page = await browser.newPage()
    await page.setViewport({ width: 1080, height: 1080, deviceScaleFactor: 1 })
    await page.goto(`file://${tmpFile}`, { waitUntil: 'networkidle0' })

    const folderName = sessionId ?? `render-${Date.now()}`
    const outputDir  = path.join(process.cwd(), 'thumbnail/output/renders', folderName)
    fs.mkdirSync(outputDir, { recursive: true })
    const outPath = path.join(outputDir, `${lang ?? 'ko'}.webp`) as `${string}.webp`

    await page.screenshot({ path: outPath, type: 'webp', quality: 88 })
    await page.close()
    await browser.close()
    fs.unlinkSync(tmpFile)

    return NextResponse.json({ saved: true, path: outPath, lang: lang ?? 'ko', sessionId: folderName })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
