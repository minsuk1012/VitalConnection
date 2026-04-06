import { NextRequest, NextResponse } from 'next/server'
import { checkAdmin } from '@/lib/auth'
import { analyzeProfile } from '@/lib/apify'
import { updateInfluencerProfile, getInfluencer } from '@/lib/db'

export async function POST(request: NextRequest) {
  const authError = await checkAdmin()
  if (authError) return authError

  const { username } = await request.json()
  if (!username) {
    return NextResponse.json({ error: 'username은 필수입니다.' }, { status: 400 })
  }

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
      })
    }

    const updated = getInfluencer(username)

    return NextResponse.json({ username, profile: updated, raw: profile })
  } catch (error: any) {
    return NextResponse.json({ error: `분석 실패: ${error.message}` }, { status: 500 })
  }
}
