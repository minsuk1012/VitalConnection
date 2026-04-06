'use client'

import { useState, useEffect, useCallback, Fragment } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious,
} from '@/components/ui/pagination'

interface Influencer {
  username: string
  fullname: string
  profile_url: string
  post_count: number
  avg_likes: number
  avg_comments: number
  avg_engagement: number
  hashtags: string[]
  samplePosts: { url: string; caption: string; likes: number; comments: number }[]
}

export default function InfluencerTab() {
  const [influencers, setInfluencers] = useState<Influencer[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [sortBy, setSortBy] = useState('engagement')
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    params.set('page', String(page))
    if (sortBy && sortBy !== 'engagement') params.set('sortBy', sortBy)

    const res = await fetch(`/api/instagram/influencers?${params}`)
    const data = await res.json()

    setInfluencers(data.rows || [])
    setTotal(data.total || 0)
    setTotalPages(data.totalPages || 0)
    setLoading(false)
  }, [page, sortBy])

  useEffect(() => { fetchData() }, [fetchData])

  function exportCSV() {
    window.open('/api/instagram/influencers/export')
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex items-center gap-3 pt-6">
          <Select value={sortBy} onValueChange={v => { setSortBy(v); setPage(1) }}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="engagement">Engagement순</SelectItem>
              <SelectItem value="likes">평균 좋아요순</SelectItem>
              <SelectItem value="comments">평균 댓글순</SelectItem>
              <SelectItem value="posts">게시물 수순</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex-1" />
          <span className="text-sm text-muted-foreground">{total}명</span>
          <Button variant="outline" size="sm" onClick={exportCSV}>
            CSV 내보내기
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>계정</TableHead>
                <TableHead className="text-right">게시물</TableHead>
                <TableHead className="text-right">평균 좋아요</TableHead>
                <TableHead className="text-right">평균 댓글</TableHead>
                <TableHead className="text-right">Engagement</TableHead>
                <TableHead>해시태그</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">로딩중...</TableCell>
                </TableRow>
              ) : influencers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">인플루언서 데이터가 없습니다.</TableCell>
                </TableRow>
              ) : (
                influencers.map((inf, idx) => (
                  <Fragment key={inf.username}>
                    <TableRow
                      onClick={() => setExpanded(expanded === inf.username ? null : inf.username)}
                      className="cursor-pointer"
                    >
                      <TableCell className="text-muted-foreground">{(page - 1) * 50 + idx + 1}</TableCell>
                      <TableCell>
                        <a href={inf.profile_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium"
                           onClick={e => e.stopPropagation()}>
                          @{inf.username}
                        </a>
                        {inf.fullname && <div className="text-xs text-muted-foreground">{inf.fullname}</div>}
                      </TableCell>
                      <TableCell className="text-right">{inf.post_count}</TableCell>
                      <TableCell className="text-right">{inf.avg_likes.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{inf.avg_comments.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-bold text-primary">{inf.avg_engagement.toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {inf.hashtags.slice(0, 3).map(h => (
                            <Badge key={h} variant="secondary" className="text-xs">#{h}</Badge>
                          ))}
                          {inf.hashtags.length > 3 && (
                            <span className="text-muted-foreground text-xs">+{inf.hashtags.length - 3}</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    {expanded === inf.username && inf.samplePosts.length > 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="bg-muted/50 px-8">
                          <div className="text-xs font-semibold text-muted-foreground mb-2">샘플 게시물 (상위 {inf.samplePosts.length}개)</div>
                          <div className="space-y-2">
                            {inf.samplePosts.map((post, i) => (
                              <div key={i} className="flex items-center gap-3 text-xs">
                                <a href={post.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate max-w-xs">
                                  {(post.caption || '').slice(0, 60) || post.url}
                                </a>
                                <span className="text-muted-foreground">{post.likes} likes</span>
                                <span className="text-muted-foreground">{post.comments} comments</span>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                text="이전"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className={page === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              />
            </PaginationItem>
            <PaginationItem>
              <span className="px-3 py-1 text-sm text-muted-foreground">{page} / {totalPages}</span>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                text="다음"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className={page === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  )
}
