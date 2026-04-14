import { NextResponse } from 'next/server'
import { checkAdmin } from '@/lib/auth'
import { PATHS, listImagesRecursive } from '@/lib/thumbnail'

export async function GET() {
  const authError = await checkAdmin()
  if (authError) return authError
  return NextResponse.json({ files: listImagesRecursive(PATHS.modelsRaw) })
}
