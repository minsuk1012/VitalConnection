import { NextResponse } from 'next/server'
import { checkAdmin } from '@/lib/auth'
import { getRegistry } from '@/lib/thumbnail'

// GET /api/thumbnail/registry
export async function GET() {
  const authError = await checkAdmin()
  if (authError) return authError

  return NextResponse.json(getRegistry())
}
