import { NextResponse } from 'next/server'
import { getSceneTokens } from '@/lib/thumbnail-registry'
import { checkAdmin } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const authError = await checkAdmin()
  if (authError) return authError

  return NextResponse.json({
    scenes: getSceneTokens(),
  })
}
