import { NextRequest, NextResponse } from 'next/server'
import { checkAdmin } from '@/lib/auth'
import { queryResults, getCollections, getPostsGroupedBySearchTag, getPostsBySearchTag, getPostsByUsername } from '@/lib/db'

export async function GET(request: NextRequest) {
  const authError = await checkAdmin()
  if (authError) return authError

  const params = request.nextUrl.searchParams

  // 검색어별 그룹 조회
  if (params.get('grouped') === 'true') {
    const groups = getPostsGroupedBySearchTag()
    return NextResponse.json({ groups })
  }

  // 검색어별 게시물 조회
  const searchTag = params.get('searchTag')
  if (searchTag && !params.get('page')) {
    const posts = getPostsBySearchTag(searchTag)
    return NextResponse.json({ posts })
  }

  // 계정별 게시물 조회
  const ownerUsername = params.get('username')
  if (ownerUsername && !params.get('page')) {
    const posts = getPostsByUsername(ownerUsername)
    return NextResponse.json({ posts })
  }

  const data = queryResults({
    collectionId: params.get('collectionId') ? Number(params.get('collectionId')) : undefined,
    collectionType: params.get('collectionType') || undefined,
    search: params.get('search') || undefined,
    minLikes: params.get('minLikes') ? Number(params.get('minLikes')) : undefined,
    maxLikes: params.get('maxLikes') ? Number(params.get('maxLikes')) : undefined,
    minComments: params.get('minComments') ? Number(params.get('minComments')) : undefined,
    maxComments: params.get('maxComments') ? Number(params.get('maxComments')) : undefined,
    sortBy: params.get('sortBy') || 'likes',
    sortOrder: params.get('sortOrder') || 'desc',
    page: params.get('page') ? Number(params.get('page')) : 1,
    pageSize: 50,
  })

  const collections = getCollections()

  return NextResponse.json({ ...data, collections })
}
