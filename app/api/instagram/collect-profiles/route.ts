import { NextRequest, NextResponse } from 'next/server'
import { checkAdmin } from '@/lib/auth'
import { analyzeProfile } from '@/lib/apify'
import { updateInfluencerProfile, insertPosts, createCollection, updateCollection, recalculateInfluencer, insertActivity } from '@/lib/db'

export async function POST(request: NextRequest) {
  const authError = await checkAdmin()
  if (authError) return authError

  const { usernames } = await request.json()
  if (!usernames || !Array.isArray(usernames) || usernames.length === 0) {
    return NextResponse.json({ error: 'usernames 배열은 필수입니다.' }, { status: 400 })
  }

  const collectionId = createCollection('profile', usernames.join(','), usernames.length)
  const results = []

  try {
    for (const username of usernames) {
      try {
        const result = await analyzeProfile(username)
        const profile = result.profile as any
        if (profile) {
          updateInfluencerProfile(username, {
            bio: profile.biography || profile.bio || '',
            followers: profile.followersCount ?? profile.followers ?? 0,
            following: profile.followingCount ?? profile.following ?? 0,
            is_business: profile.isBusinessAccount ?? profile.isBusiness ?? false,
            fullname: profile.fullName || profile.name || '',
            total_posts: profile.postsCount ?? profile.mediaCount ?? 0,
            is_verified: profile.isVerified ?? profile.verified ?? false,
            external_url: profile.externalUrl || profile.website || '',
            category: profile.businessCategoryName || profile.categoryName || '',
            profile_pic_url: profile.profilePicUrl || profile.profilePicUrlHd || '',
          })
          // latestPosts를 posts 테이블에 저장
          const latestPosts = profile.latestPosts || []
          let postsInserted = 0
          if (latestPosts.length > 0) {
            postsInserted = insertPosts(collectionId, latestPosts, username)
          }

          recalculateInfluencer(username)
          insertActivity(username, 'profile_refresh', 'candidate', { postsInserted })
          results.push({ username, status: 'ok', postsInserted })
        } else {
          results.push({ username, status: 'no_data' })
        }
      } catch (err: any) {
        results.push({ username, status: 'error', error: err.message })
      }
    }

    updateCollection(collectionId, 'completed', results.filter(r => r.status === 'ok').length)
    return NextResponse.json({ collectionId, results })
  } catch (error: any) {
    updateCollection(collectionId, 'failed', 0)
    return NextResponse.json({ error: `프로필 수집 실패: ${error.message}` }, { status: 500 })
  }
}
