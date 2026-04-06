import { NextRequest, NextResponse } from 'next/server'
import { checkAdmin } from '@/lib/auth'
import { collectFromInstagram } from '@/lib/apify'
import { createCollection, updateCollection, insertPosts, refreshInfluencers } from '@/lib/db'

export async function POST(request: NextRequest) {
  const authError = await checkAdmin()
  if (authError) return authError

  const body = await request.json()
  const { type, query, limit = 30 } = body

  if (!type || !query) {
    return NextResponse.json({ error: 'type과 query는 필수입니다.' }, { status: 400 })
  }

  if (!['hashtag', 'profile', 'location', 'keyword'].includes(type)) {
    return NextResponse.json({ error: '유효하지 않은 type입니다.' }, { status: 400 })
  }

  const collectionId = createCollection(type, query, limit)

  try {
    const items = await collectFromInstagram(type, query, limit)
    const inserted = insertPosts(collectionId, items, query)
    updateCollection(collectionId, 'completed', inserted)
    refreshInfluencers()

    return NextResponse.json({
      collectionId,
      query,
      collected: items.length,
      inserted,
    })
  } catch (error: any) {
    updateCollection(collectionId, 'failed', 0)
    return NextResponse.json({
      error: `수집 실패: ${error.message}`,
      collectionId,
      query,
    }, { status: 500 })
  }
}
