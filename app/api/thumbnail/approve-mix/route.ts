import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { THUMBNAIL_BASE } from '@/lib/thumbnail'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const filename = body?.filename

  if (!filename || typeof filename !== 'string' || !/^mix-\d+\.webp$/.test(filename)) {
    return NextResponse.json({ error: '유효하지 않은 filename' }, { status: 400 })
  }

  const mixDir = path.join(THUMBNAIL_BASE, 'references-transformed/mixed')
  const approvedDir = path.join(mixDir, 'approved')
  const src = path.join(mixDir, filename)
  const dst = path.join(approvedDir, filename)

  if (fs.existsSync(dst)) {
    return NextResponse.json({ ok: true, filename, alreadyApproved: true })
  }

  if (!fs.existsSync(src)) {
    return NextResponse.json({ error: '파일 없음' }, { status: 404 })
  }

  fs.mkdirSync(approvedDir, { recursive: true })
  fs.renameSync(src, dst)

  return NextResponse.json({ ok: true, filename })
}
