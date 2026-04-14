import { NextRequest, NextResponse } from 'next/server'
import { checkAdmin } from '@/lib/auth'
import { PATHS, listImagesRecursive } from '@/lib/thumbnail'

// GET /api/thumbnail/models?type=models|cutout
export async function GET(request: NextRequest) {
  const authError = await checkAdmin()
  if (authError) return authError

  const type = request.nextUrl.searchParams.get('type') ?? 'models'
  const dir  = type === 'cutout' ? PATHS.cutout
             : type === 'raw'    ? PATHS.modelsRaw
             : PATHS.models
  const files = listImagesRecursive(dir)

  return NextResponse.json({ files, count: files.length })
}
