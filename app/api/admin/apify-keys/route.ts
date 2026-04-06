import { NextRequest, NextResponse } from 'next/server'
import { checkAdmin } from '@/lib/auth'
import { getApifyKeys, addApifyKey, deleteApifyKey } from '@/lib/db'

function maskToken(token: string): string {
  if (token.length <= 10) return '***'
  return token.slice(0, 10) + '***' + token.slice(-3)
}

// GET: 키 목록 (토큰 마스킹)
export async function GET() {
  const authError = await checkAdmin()
  if (authError) return authError

  const keys = getApifyKeys()
  const masked = keys.map(k => ({
    ...k,
    token: maskToken(k.token),
  }))
  return NextResponse.json({ keys: masked })
}

// POST: 키 추가 (유효성 검증 포함)
export async function POST(request: NextRequest) {
  const authError = await checkAdmin()
  if (authError) return authError

  const { token, label } = await request.json()
  if (!token || !label) {
    return NextResponse.json({ error: 'token과 label은 필수입니다.' }, { status: 400 })
  }

  // Apify API로 토큰 유효성 검증
  try {
    const res = await fetch('https://api.apify.com/v2/users/me/limits', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      return NextResponse.json({ error: '유효하지 않은 API 토큰입니다.' }, { status: 400 })
    }
    const data = await res.json()
    const monthlyLimit = data.data?.limits?.maxMonthlyUsageUsd ?? 5
    const currentUsage = data.data?.current?.monthlyUsageUsd ?? 0

    const result = addApifyKey(token, label, monthlyLimit, currentUsage)
    return NextResponse.json({ success: true, id: result.id })
  } catch (error: any) {
    return NextResponse.json({ error: `키 추가 실패: ${error.message}` }, { status: 500 })
  }
}

// DELETE: 키 삭제
export async function DELETE(request: NextRequest) {
  const authError = await checkAdmin()
  if (authError) return authError

  const { id } = await request.json()
  if (!id) {
    return NextResponse.json({ error: 'id는 필수입니다.' }, { status: 400 })
  }

  deleteApifyKey(id)
  return NextResponse.json({ success: true })
}
