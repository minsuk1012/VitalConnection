import { NextRequest, NextResponse } from 'next/server'
import { checkAdmin } from '@/lib/auth'
import { getActivities } from '@/lib/db'

export async function GET(request: NextRequest) {
  const authError = await checkAdmin()
  if (authError) return authError

  const username = request.nextUrl.searchParams.get('username')
  if (!username) {
    return NextResponse.json({ error: 'username은 필수입니다.' }, { status: 400 })
  }

  const activities = getActivities(username)
  return NextResponse.json({ activities })
}
