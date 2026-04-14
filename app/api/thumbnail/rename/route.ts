import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { checkAdmin } from '@/lib/auth'
import { PATHS } from '@/lib/thumbnail'

// POST /api/thumbnail/rename
// body: { from: string, to: string, type: 'models' | 'cutout' }
export async function POST(request: NextRequest) {
  const authError = await checkAdmin()
  if (authError) return authError

  const { from, to, type } = await request.json()

  if (!from || !to) {
    return NextResponse.json({ error: 'from, to 필수' }, { status: 400 })
  }

  const base = type === 'cutout' ? PATHS.cutout : PATHS.models

  // 경로 탈출 방지
  const fromAbs = path.resolve(base, from)
  const toAbs   = path.resolve(base, to)
  if (!fromAbs.startsWith(base) || !toAbs.startsWith(base)) {
    return NextResponse.json({ error: '잘못된 경로' }, { status: 400 })
  }

  if (!fs.existsSync(fromAbs)) {
    return NextResponse.json({ error: '파일 없음' }, { status: 404 })
  }

  fs.mkdirSync(path.dirname(toAbs), { recursive: true })
  fs.renameSync(fromAbs, toAbs)

  return NextResponse.json({ ok: true, to })
}
