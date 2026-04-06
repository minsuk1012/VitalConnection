import { NextRequest, NextResponse } from 'next/server'
import { checkAdmin } from '@/lib/auth'
import { getAllInfluencersForExport } from '@/lib/db'

export async function GET(request: NextRequest) {
  const authError = await checkAdmin()
  if (authError) return authError

  const influencers = getAllInfluencersForExport() as any[]

  const header = 'username,fullname,profile_url,post_count,avg_likes,avg_comments,avg_engagement,hashtags'
  const rows = influencers.map(i =>
    [
      i.username,
      `"${(i.fullname || '').replace(/"/g, '""')}"`,
      i.profile_url,
      i.post_count,
      i.avg_likes,
      i.avg_comments,
      i.avg_engagement,
      `"${i.hashtags}"`,
    ].join(',')
  )

  const csv = [header, ...rows].join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="instagram_influencers_${Date.now()}.csv"`,
    },
  })
}
