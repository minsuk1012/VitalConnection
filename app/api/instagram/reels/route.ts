import { NextRequest, NextResponse } from 'next/server'
import { checkAdmin } from '@/lib/auth'
import { getReelsByUsername, queryReels, getReelComments, getReelsGroupedByUser } from '@/lib/db'

export async function GET(request: NextRequest) {
  const authError = await checkAdmin()
  if (authError) return authError

  const params = request.nextUrl.searchParams
  const username = params.get('username')

  // 계정별 그룹 조회
  if (params.get('grouped') === 'true') {
    const groups = getReelsGroupedByUser()
    return NextResponse.json({ groups })
  }

  // 댓글 조회
  const reelId = params.get('reelId')
  if (reelId) {
    const comments = getReelComments(Number(reelId))
    return NextResponse.json({ comments })
  }

  // 단일 유저 조회 (후보관리 확장 행에서 사용)
  if (username && !params.get('page')) {
    const reels = getReelsByUsername(username)
    return NextResponse.json({ reels })
  }

  // 페이지네이션 조회 (탐색에서 사용)
  const data = queryReels({
    username: username || undefined,
    sortBy: params.get('sortBy') || 'views',
    sortOrder: params.get('sortOrder') || 'desc',
    page: params.get('page') ? Number(params.get('page')) : 1,
    pageSize: 50,
  })

  return NextResponse.json(data)
}
