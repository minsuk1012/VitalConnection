import { NextResponse } from 'next/server'
import { getLayoutTokens, getEffectTokens } from '@/lib/thumbnail-compose'
import { checkAdmin } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const authError = await checkAdmin()
  if (authError) return authError

  return NextResponse.json({
    layouts: getLayoutTokens(),
    effects: getEffectTokens(),
  })
}
