import { NextRequest, NextResponse } from 'next/server'
import { checkAdmin } from '@/lib/auth'
import { collectComments } from '@/lib/apify'
import { createCollection, updateCollection } from '@/lib/db'

export async function POST(request: NextRequest) {
  const authError = await checkAdmin()
  if (authError) return authError

  const { urls, limit = 100 } = await request.json()
  if (!urls || !Array.isArray(urls) || urls.length === 0) {
    return NextResponse.json({ error: 'urls 배열은 필수입니다.' }, { status: 400 })
  }

  const collectionId = createCollection('comment', urls.join(','), limit)

  try {
    const items = await collectComments(urls, limit)
    updateCollection(collectionId, 'completed', items.length)
    return NextResponse.json({ collectionId, urls: urls.length, collected: items.length })
  } catch (error: any) {
    updateCollection(collectionId, 'failed', 0)
    return NextResponse.json({ error: `댓글 수집 실패: ${error.message}` }, { status: 500 })
  }
}
