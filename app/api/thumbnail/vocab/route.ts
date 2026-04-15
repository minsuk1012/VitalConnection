import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { THUMBNAIL_BASE } from '@/lib/thumbnail'

export const dynamic = 'force-dynamic'

export async function GET() {
  const vocabPath = path.join(THUMBNAIL_BASE, 'design-vocabulary.json')
  if (!fs.existsSync(vocabPath)) {
    return NextResponse.json({ error: 'design-vocabulary.json 없음. npm run thumbnail:extract-vocab 실행 필요' }, { status: 404 })
  }
  const vocab = JSON.parse(fs.readFileSync(vocabPath, 'utf-8'))
  return NextResponse.json(vocab)
}
