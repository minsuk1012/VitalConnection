'use client'

import { useState, useEffect, useCallback, Fragment } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious,
} from '@/components/ui/pagination'

const STATUSES = ['미확인', '후보', '연락중', '확정', '제외'] as const

interface Influencer {
  username: string
  fullname: string
  profile_url: string
  post_count: number
  avg_likes: number
  avg_comments: number
  avg_engagement: number
  hashtags: string[]
  status: string
  memo: string
  bio: string
  followers: number
  following: number
  is_business: number
  samplePosts: { url: string; caption: string; likes: number; comments: number }[]
}

export default function CandidatesTab() {
  const [influencers, setInfluencers] = useState<Influencer[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [sortBy, setSortBy] = useState('engagement')
  const [filterStatus, setFilterStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [editingMemo, setEditingMemo] = useState<string | null>(null)
  const [memoValue, setMemoValue] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    params.set('page', String(page))
    if (sortBy && sortBy !== 'engagement') params.set('sortBy', sortBy)
    if (filterStatus) params.set('status', filterStatus)

    const res = await fetch(`/api/instagram/influencers?${params}`)
    const data = await res.json()

    setInfluencers(data.rows || [])
    setTotal(data.total || 0)
    setTotalPages(data.totalPages || 0)
    setLoading(false)
  }, [page, sortBy, filterStatus])

  useEffect(() => { fetchData() }, [fetchData])

  async function updateStatus(username: string, status: string) {
    await fetch('/api/instagram/candidates', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, status }),
    })
    setInfluencers(prev => prev.map(i => i.username === username ? { ...i, status } : i))
  }

  async function saveMemo(username: string) {
    await fetch('/api/instagram/candidates', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, memo: memoValue }),
    })
    setInfluencers(prev => prev.map(i => i.username === username ? { ...i, memo: memoValue } : i))
    setEditingMemo(null)
  }

  function startEditMemo(username: string, currentMemo: string) {
    setEditingMemo(username)
    setMemoValue(currentMemo || '')
  }

  function exportCSV() {
    window.open('/api/instagram/influencers/export')
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex items-center gap-3 pt-6">
          <Select value={filterStatus} onValueChange={v => { setFilterStatus(v === 'all' ? '' : v); setPage(1) }}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="전체 상태" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 상태</SelectItem>
              {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>

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
          <Button variant="outline" size="sm" onClick={exportCSV}>CSV 내보내기</Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>계정</TableHead>
                <TableHead className="text-right">팔로워</TableHead>
                <TableHead className="text-right">Engagement</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>메모</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">로딩중...</TableCell>
                </TableRow>
              ) : influencers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">후보 데이터가 없습니다. 먼저 수집 후 탐색에서 프로필을 분석하세요.</TableCell>
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
                        <a href={inf.profile_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium" onClick={e => e.stopPropagation()}>
                          @{inf.username}
                        </a>
                        {inf.fullname && <div className="text-xs text-muted-foreground">{inf.fullname}</div>}
                      </TableCell>
                      <TableCell className="text-right">{inf.followers > 0 ? inf.followers.toLocaleString() : '-'}</TableCell>
                      <TableCell className="text-right font-bold text-primary">{inf.avg_engagement.toLocaleString()}</TableCell>
                      <TableCell onClick={e => e.stopPropagation()}>
                        <Select value={inf.status} onValueChange={v => updateStatus(inf.username, v)}>
                          <SelectTrigger className="w-[100px] h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell onClick={e => e.stopPropagation()}>
                        {editingMemo === inf.username ? (
                          <div className="flex gap-1">
                            <Input
                              value={memoValue}
                              onChange={e => setMemoValue(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') saveMemo(inf.username) }}
                              className="h-7 text-xs"
                              autoFocus
                            />
                            <Button size="xs" onClick={() => saveMemo(inf.username)}>저장</Button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEditMemo(inf.username, inf.memo)}
                            className="text-xs text-muted-foreground hover:text-foreground text-left"
                          >
                            {inf.memo || '메모 추가...'}
                          </button>
                        )}
                      </TableCell>
                    </TableRow>
                    {expanded === inf.username && (
                      <TableRow>
                        <TableCell colSpan={6} className="bg-muted/50 px-8 py-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                            <div>
                              <div className="text-muted-foreground text-xs">팔로워</div>
                              <div className="font-medium">{inf.followers > 0 ? inf.followers.toLocaleString() : '미수집'}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground text-xs">팔로잉</div>
                              <div className="font-medium">{inf.following > 0 ? inf.following.toLocaleString() : '미수집'}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground text-xs">평균 좋아요</div>
                              <div className="font-medium">{inf.avg_likes.toLocaleString()}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground text-xs">평균 댓글</div>
                              <div className="font-medium">{inf.avg_comments.toLocaleString()}</div>
                            </div>
                            {inf.bio && (
                              <div className="col-span-2 md:col-span-4">
                                <div className="text-muted-foreground text-xs">바이오</div>
                                <div className="text-sm">{inf.bio}</div>
                              </div>
                            )}
                          </div>
                          {inf.hashtags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-3">
                              {inf.hashtags.map(h => (
                                <Badge key={h} variant="secondary" className="text-xs">#{h}</Badge>
                              ))}
                            </div>
                          )}
                          {inf.samplePosts?.length > 0 && (
                            <div>
                              <div className="text-xs font-semibold text-muted-foreground mb-2">샘플 게시물</div>
                              <div className="space-y-1">
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
                            </div>
                          )}
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
              <PaginationPrevious text="이전" onClick={() => setPage(p => Math.max(1, p - 1))} className={page === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'} />
            </PaginationItem>
            <PaginationItem>
              <span className="px-3 py-1 text-sm text-muted-foreground">{page} / {totalPages}</span>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext text="다음" onClick={() => setPage(p => Math.min(totalPages, p + 1))} className={page === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'} />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  )
}
