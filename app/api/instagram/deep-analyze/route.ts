import { NextRequest, NextResponse } from 'next/server'
import { checkAdmin } from '@/lib/auth'
import { collectReels, collectComments } from '@/lib/apify'
import {
  insertReels, getReelsByUsername, insertReelComments,
  updateInfluencerDeepAnalysis, getInfluencer,
} from '@/lib/db'
import { detectLanguage, detectLanguageDistribution } from '@/lib/metrics'

const DEFAULT_FILTERS = {
  minViews: 1000,
  minLikes: 50,
  maxAgeDays: 90,
  maxReelsToAnalyze: 5,
  reelsLimit: 20,
  commentsLimit: 100,
}

export async function POST(request: NextRequest) {
  const authError = await checkAdmin()
  if (authError) return authError

  const body = await request.json()
  const { username, filters } = body
  if (!username) {
    return NextResponse.json({ error: 'username은 필수입니다.' }, { status: 400 })
  }

  const f = { ...DEFAULT_FILTERS, ...filters }

  try {
    // Step 1: 릴스 수집
    const rawReels = await collectReels(username, f.reelsLimit)
    const insertedReels = insertReels(username, rawReels)

    // Step 2: 앱 레벨 필터링
    const allReels = getReelsByUsername(username)
    const cutoffDate = new Date(Date.now() - f.maxAgeDays * 24 * 60 * 60 * 1000).toISOString()

    const filteredReels = allReels
      .filter(r => r.views >= f.minViews)
      .filter(r => r.likes >= f.minLikes)
      .filter(r => !r.postTimestamp || r.postTimestamp >= cutoffDate)
      .slice(0, f.maxReelsToAnalyze)

    if (filteredReels.length === 0) {
      return NextResponse.json({
        username,
        reelsCollected: insertedReels,
        reelsFiltered: 0,
        message: '필터 조건을 만족하는 릴스가 없습니다.',
      })
    }

    // Step 3: 필터 통과한 릴스의 댓글 수집
    const reelUrls = filteredReels.map(r => r.reelUrl).filter(Boolean)
    const rawComments = await collectComments(reelUrls, f.commentsLimit)

    // 댓글을 릴스별로 매핑하여 저장
    let totalComments = 0
    for (const reel of filteredReels) {
      const reelComments = rawComments.filter((c: any) =>
        (c.postUrl || c.inputUrl || '').includes(reel.shortcode || '___none___')
      )
      if (reelComments.length > 0) {
        totalComments += insertReelComments(reel.id, reelComments, detectLanguage)
      }
    }

    // fallback: 매핑 실패 시 전부 첫 번째 릴스에 할당
    if (totalComments === 0 && rawComments.length > 0) {
      totalComments = insertReelComments(filteredReels[0].id, rawComments, detectLanguage)
    }

    // Step 4: 댓글 분석
    const allCommentTexts = rawComments.map((c: any) => c.text || c.comment || '')
    const langDist = detectLanguageDistribution(allCommentTexts)

    // 댓글 품질 점수
    const emojiOnlyPattern = /^[\p{Emoji}\s]+$/u
    const lowQualityCount = allCommentTexts.filter((t: string) => {
      const trimmed = t.trim()
      return trimmed.length <= 3 || emojiOnlyPattern.test(trimmed)
    }).length
    const commentQualityScore = allCommentTexts.length > 0
      ? Math.round((1 - lowQualityCount / allCommentTexts.length) * 100) / 100
      : 0

    // Step 5: DB 저장
    updateInfluencerDeepAnalysis(username, {
      commentLangDistribution: langDist,
      commentQualityScore,
    })

    const updated = getInfluencer(username)

    return NextResponse.json({
      username,
      reelsCollected: insertedReels,
      reelsAnalyzed: filteredReels.length,
      commentsAnalyzed: allCommentTexts.length,
      commentLanguageDistribution: langDist,
      commentQualityScore,
      influencer: updated,
    })
  } catch (error: any) {
    return NextResponse.json({ error: `심층 분석 실패: ${error.message}` }, { status: 500 })
  }
}
