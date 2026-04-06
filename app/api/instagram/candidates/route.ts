import { NextRequest, NextResponse } from 'next/server'
import { checkAdmin } from '@/lib/auth'
import { updateCandidate } from '@/lib/db'

export async function PUT(request: NextRequest) {
  const authError = await checkAdmin()
  if (authError) return authError

  const { username, status, memo, tags } = await request.json()
  if (!username) {
    return NextResponse.json({ error: 'username은 필수입니다.' }, { status: 400 })
  }

  updateCandidate(username, { status, memo, tags })

  return NextResponse.json({ success: true, username })
}
