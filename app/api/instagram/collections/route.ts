import { NextResponse } from 'next/server'
import { checkAdmin } from '@/lib/auth'
import { getCollections } from '@/lib/db'

export async function GET() {
  const authError = await checkAdmin()
  if (authError) return authError

  const data = getCollections()
  return NextResponse.json(data)
}
