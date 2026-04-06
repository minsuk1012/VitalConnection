import { NextRequest, NextResponse } from 'next/server'
import { checkAdmin } from '@/lib/auth'
import { queryResults, getCollections, getDistinctSearchTags } from '@/lib/db'

export async function GET(request: NextRequest) {
  const authError = await checkAdmin()
  if (authError) return authError

  const params = request.nextUrl.searchParams

  const data = queryResults({
    collectionId: params.get('collectionId') ? Number(params.get('collectionId')) : undefined,
    searchTag: params.get('searchTag') || undefined,
    minLikes: params.get('minLikes') ? Number(params.get('minLikes')) : undefined,
    sortBy: params.get('sortBy') || 'likes',
    sortOrder: params.get('sortOrder') || 'desc',
    page: params.get('page') ? Number(params.get('page')) : 1,
    pageSize: 50,
  })

  const collections = getCollections()
  const searchTags = getDistinctSearchTags()

  return NextResponse.json({ ...data, collections, searchTags })
}
