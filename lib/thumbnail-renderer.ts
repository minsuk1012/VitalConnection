/**
 * Puppeteer 기반 썸네일 렌더러 (스크립트 전용)
 * Next.js API route와 달리 직접 파일 저장
 */
import puppeteer, { type Browser } from 'puppeteer-core'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { buildTemplateHtml, type TemplateInput } from './thumbnail.js'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

let browser: Browser | null = null

async function getBrowser(): Promise<Browser> {
  if (!browser) {
    browser = await puppeteer.launch({
      executablePath: CHROME,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })
  }
  return browser
}

export async function closeBrowser(): Promise<void> {
  if (browser) { await browser.close(); browser = null }
}

export type LayoutType = string

export async function renderTemplate(
  layout: LayoutType,
  input: TemplateInput,
  outputPath: string,
): Promise<void> {
  // 로컬 파일 참조를 위해 baseUrl 없이 file:// 방식 사용
  const html    = buildTemplateHtml(layout, input)
  const tmpFile = path.join(os.tmpdir(), `thumbnail-${Date.now()}.html`)
  fs.writeFileSync(tmpFile, html, 'utf-8')

  const b    = await getBrowser()
  const page = await b.newPage()

  try {
    await page.setViewport({ width: 1080, height: 1080, deviceScaleFactor: 1 })
    await page.goto(`file://${tmpFile}`, { waitUntil: 'networkidle0' })

    fs.mkdirSync(path.dirname(outputPath), { recursive: true })
    await page.screenshot({
      path: outputPath as `${string}.webp`,
      type: 'webp',
      quality: 88,
    })
  } finally {
    await page.close()
    fs.unlinkSync(tmpFile)
  }
}
