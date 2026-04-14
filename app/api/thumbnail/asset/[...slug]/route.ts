/**
 * GET /api/thumbnail/asset/models/dewy_glow/img.webp
 * GET /api/thumbnail/asset/fonts/BebasNeue-Regular.ttf
 * thumbnail-gen 디렉토리 내 파일을 HTTP로 서빙
 */
import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { PATHS } from '@/lib/thumbnail'

export const dynamic = 'force-dynamic'

const MIME: Record<string, string> = {
  '.webp':  'image/webp',
  '.png':   'image/png',
  '.jpg':   'image/jpeg',
  '.jpeg':  'image/jpeg',
  '.ttf':   'font/ttf',
  '.otf':   'font/otf',
  '.ttc':   'font/collection',
  '.woff2': 'font/woff2',
}

const ALLOWED_BASES: Record<string, string> = {
  'models':        PATHS.models,
  'models-raw':    PATHS.modelsRaw,
  'models-cutout': PATHS.cutout,
  'fonts':         PATHS.fonts,
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  const { slug } = await params
  const [base, ...rest] = slug

  const baseDir = ALLOWED_BASES[base]
  if (!baseDir) return new NextResponse('Not found', { status: 404 })

  const filePath = path.resolve(baseDir, ...rest)
  // 경로 탈출 방지
  if (!filePath.startsWith(baseDir)) {
    return new NextResponse('Forbidden', { status: 403 })
  }
  if (!fs.existsSync(filePath)) {
    return new NextResponse('Not found', { status: 404 })
  }

  const ext  = path.extname(filePath).toLowerCase()
  const mime = MIME[ext] ?? 'application/octet-stream'
  const buf  = fs.readFileSync(filePath)

  return new NextResponse(buf, {
    headers: {
      'Content-Type': mime,
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
