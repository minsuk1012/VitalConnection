/**
 * POST /api/thumbnail/cutout
 * body: { file: string }  — models/ 하위 상대 경로
 * → 누끼 처리 후 models-cutout/ 저장
 */
import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { checkAdmin } from '@/lib/auth'
import { PATHS } from '@/lib/thumbnail'

export const dynamic = 'force-dynamic'
export const maxDuration = 300  // 첫 실행 시 ONNX 모델 다운로드 대기

export async function POST(request: NextRequest) {
  const authError = await checkAdmin()
  if (authError) return authError

  const { file, source = 'raw' } = await request.json()
  if (!file) return NextResponse.json({ error: 'file 필수' }, { status: 400 })

  const srcDir    = source === 'models' ? PATHS.models : PATHS.modelsRaw
  const inputPath = path.resolve(srcDir, file)
  const outName    = file.replace(/\.(webp|jpg|jpeg|png)$/i, '.png')
  const outputPath = path.resolve(PATHS.cutout, outName)

  // 경로 탈출 방지
  if (!inputPath.startsWith(srcDir)) {
    return NextResponse.json({ error: '잘못된 경로' }, { status: 400 })
  }
  if (!fs.existsSync(inputPath)) {
    return NextResponse.json({ error: '파일 없음' }, { status: 404 })
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true })

  try {
    const sharp             = (await import('sharp')).default
    const { removeBackground } = await import('@imgly/background-removal-node')

    const pngBuf = await sharp(inputPath).png().toBuffer()
    const blob   = new Blob([pngBuf.buffer as ArrayBuffer], { type: 'image/png' })
    const result = await removeBackground(blob, {
      model: 'medium',
      output: { format: 'image/png', quality: 1.0 },
    })

    const resultBuffer = await result.arrayBuffer()
    fs.writeFileSync(outputPath, Buffer.from(resultBuffer))

    return NextResponse.json({ ok: true, output: outName })
  } catch (e: any) {
    console.error('[cutout] error:', e)
    return NextResponse.json({ error: e.message, stack: e.stack }, { status: 500 })
  }
}
