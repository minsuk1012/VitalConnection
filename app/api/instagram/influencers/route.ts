import { NextRequest, NextResponse } from 'next/server'
import { checkAdmin } from '@/lib/auth'
import { queryInfluencers, getInfluencerSamplePosts, getStatusCounts } from '@/lib/db'

export async function GET(request: NextRequest) {
  const authError = await checkAdmin()
  if (authError) return authError

  const params = request.nextUrl.searchParams

  const data = queryInfluencers({
    status: params.get('status') || undefined,
    sortBy: params.get('sortBy') || undefined,
    sortOrder: params.get('sortOrder') || 'desc',
    page: params.get('page') ? Number(params.get('page')) : 1,
    pageSize: 50,
  })

  const rowsWithSamples = (data.rows as any[]).map(row => ({
    ...row,
    hashtags: JSON.parse(row.hashtags || '[]'),
    samplePosts: getInfluencerSamplePosts(row.username),
  }))

  return NextResponse.json({ ...data, rows: rowsWithSamples, statusCounts: getStatusCounts() })
}
