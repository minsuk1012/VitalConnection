import { NextRequest, NextResponse } from 'next/server'
import { checkAdmin } from '@/lib/auth'
import { collectReels, collectComments } from '@/lib/apify'
import { deleteReelsByUsername, insertReels, getReelsByUsername, insertReelComments, refreshInfluencersForUser } from '@/lib/db'
import { detectLanguage } from '@/lib/metrics'

export async function POST(request: NextRequest) {
  const authError = await checkAdmin()
  if (authError) return authError

  const { username, limit = 20 } = await request.json()
  if (!username) {
    return NextResponse.json({ error: 'username은 필수입니다.' }, { status: 400 })
  }

  try {
    // 기존 릴스+댓글 삭제
    deleteReelsByUsername(username)

    // 새로 수집
    const rawReels = await collectReels(username, limit)
    const inserted = insertReels(username, rawReels)

    // 댓글 수집
    let totalComments = 0
    const allReels = getReelsByUsername(username)
    const reelUrls = allReels.map(r => r.reelUrl).filter(Boolean)

    if (reelUrls.length > 0) {
      try {
        const rawComments = await collectComments(reelUrls, 50)
        for (const reel of allReels) {
          const matched = rawComments.filter((c: any) =>
            (c.postUrl || c.inputUrl || '').includes(reel.shortcode || '___none___')
          )
          if (matched.length > 0) {
            totalComments += insertReelComments(reel.id, matched, detectLanguage)
          }
        }
      } catch {}
    }

    refreshInfluencersForUser(username)

    return NextResponse.json({
      username,
      reelsInserted: inserted,
      commentsCollected: totalComments,
    })
  } catch (error: any) {
    return NextResponse.json({ error: `최신화 실패: ${error.message}` }, { status: 500 })
  }
}
