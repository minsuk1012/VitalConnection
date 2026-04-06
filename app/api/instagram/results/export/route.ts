import { NextRequest, NextResponse } from 'next/server'
import { checkAdmin } from '@/lib/auth'
import { getAllPostsForExport } from '@/lib/db'

export async function GET(request: NextRequest) {
  const authError = await checkAdmin()
  if (authError) return authError

  const params = request.nextUrl.searchParams
  const posts = getAllPostsForExport({
    collectionId: params.get('collectionId') ? Number(params.get('collectionId')) : undefined,
    searchTag: params.get('searchTag') || undefined,
    minLikes: params.get('minLikes') ? Number(params.get('minLikes')) : undefined,
  }) as any[]

  const header = 'username,fullname,url,caption,likes,comments,hashtags,location,timestamp,search_tag'
  const rows = posts.map(p =>
    [
      p.owner_username,
      `"${(p.owner_fullname || '').replace(/"/g, '""')}"`,
      p.url,
      `"${(p.caption || '').replace(/"/g, '""').replace(/\n/g, ' ').slice(0, 200)}"`,
      p.likes,
      p.comments,
      `"${p.hashtags}"`,
      `"${(p.location || '').replace(/"/g, '""')}"`,
      p.post_timestamp,
      p.search_tag,
    ].join(',')
  )

  const csv = [header, ...rows].join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="instagram_results_${Date.now()}.csv"`,
    },
  })
}
