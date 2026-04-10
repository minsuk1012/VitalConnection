import { NextRequest, NextResponse } from 'next/server'
import { checkAdmin } from '@/lib/auth'
import { collectReels, collectComments } from '@/lib/apify'
import { insertReels, getReelsByUsername, insertReelComments, createCollection, updateCollection, refreshInfluencersForUser, insertActivity } from '@/lib/db'
import { detectLanguage } from '@/lib/metrics'

export async function POST(request: NextRequest) {
  const authError = await checkAdmin()
  if (authError) return authError

  const { username, limit = 20 } = await request.json()
  if (!username) {
    return NextResponse.json({ error: 'username은 필수입니다.' }, { status: 400 })
  }

  const collectionId = createCollection('reel', username, limit)

  try {
    // Step 1: 릴스 수집
    const rawReels = await collectReels(username, limit)
    const inserted = insertReels(username, rawReels)

    // Step 2: 댓글 수집 (수집된 릴스의 URL로)
    let totalComments = 0
    const allReels = getReelsByUsername(username)
    const reelUrls = allReels.map(r => r.reelUrl).filter(Boolean)

    if (reelUrls.length > 0) {
      try {
        const rawComments = await collectComments(reelUrls, 50)

        // 릴스별로 댓글 매핑
        for (const reel of allReels) {
          const matched = rawComments.filter((c: any) =>
            (c.postUrl || c.inputUrl || '').includes(reel.shortcode || '___none___')
          )
          if (matched.length > 0) {
            totalComments += insertReelComments(reel.id, matched, detectLanguage)
          }
        }

      } catch {
        // 댓글 수집 실패해도 릴스 수집은 성공으로 처리
      }
    }

    refreshInfluencersForUser(username)
    updateCollection(collectionId, 'completed', inserted)
    insertActivity(username, 'reels_collect', 'candidate', { inserted, comments: totalComments })

    return NextResponse.json({
      collectionId, username,
      reelsCollected: rawReels.length,
      reelsInserted: inserted,
      commentsCollected: totalComments,
    })
  } catch (error: any) {
    updateCollection(collectionId, 'failed', 0)
    return NextResponse.json({ error: `릴스 수집 실패: ${error.message}` }, { status: 500 })
  }
}
