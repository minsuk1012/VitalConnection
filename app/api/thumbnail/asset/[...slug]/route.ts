import { NextRequest, NextResponse } from 'next/server'
import { PATHS, THUMBNAIL_BASE } from '@/lib/thumbnail'
import path from 'path'
import fs from 'fs'
import mime from 'mime-types'

export const dynamic = 'force-dynamic'

const ALLOWED_BASES: Record<string, string> = {
  'models':        PATHS.models,
  'models-raw':    PATHS.modelsRaw,
  'models-cutout': PATHS.cutout,
  'fonts':         PATHS.fonts,
  'docs':          path.join(THUMBNAIL_BASE, 'docs'),
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string[] } },
) {
  const [base, ...rest] = params.slug
  const baseDir = ALLOWED_BASES[base]
  if (!baseDir) {
    return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
  }

  const filePath = path.join(baseDir, ...rest)

  // path traversal guard
  if (!filePath.startsWith(baseDir)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const stat = fs.statSync(filePath)
  if (stat.isDirectory()) {
    return NextResponse.json({ error: 'Is a directory' }, { status: 400 })
  }

  const buf = fs.readFileSync(filePath)
  const mimeType = mime.lookup(filePath) || 'application/octet-stream'
  return new NextResponse(buf, {
    headers: { 'Content-Type': mimeType },
  })
}
