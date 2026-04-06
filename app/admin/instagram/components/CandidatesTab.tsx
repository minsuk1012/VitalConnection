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
  profileUrl: string
  postCount: number
  avgLikes: number
  avgComments: number
  avgEngagement: number
  hashtags: string[]
  status: string
  memo: string
  bio: string
  followers: number
  following: number
  isBusiness: number
  samplePosts: { url: string; caption: string; likes: number; comments: number }[]
  engagementRate: number
  fitScore: number
  commentLikeRatio: number
  followerFollowingRatio: number
  postingFrequency: number
  lastPostDate: string
  contentRelevance: number
  detectedLanguage: string
  commentQualityScore: number
  commentLangDistribution: string
  deepAnalyzedAt: string
}

export default function CandidatesTab() {
  const [influencers, setInfluencers] = useState<Influencer[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [sortBy, setSortBy] = useState('fitScore')
  const [filterStatus, setFilterStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [editingMemo, setEditingMemo] = useState<string | null>(null)
  const [memoValue, setMemoValue] = useState('')
  const [deepAnalyzing, setDeepAnalyzing] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    params.set('page', String(page))
    if (sortBy && sortBy !== 'fitScore') params.set('sortBy', sortBy)
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

  async function deepAnalyze(username: string) {
    if (!confirm(`${username}의 심층 분석을 시작합니다.\n릴스 수집 + 댓글 수집으로 Apify 크레딧이 ~$1.2 소모됩니다.\n계속하시겠습니까?`)) return
    setDeepAnalyzing(username)
    try {
      const res = await fetch('/api/instagram/deep-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      })
      const data = await res.json()
      if (data.influencer) {
        setInfluencers(prev => prev.map(i => i.username === username ? {
          ...i,
          ...data.influencer,
          hashtags: JSON.parse(data.influencer.hashtags || '[]'),
          samplePosts: i.samplePosts,
        } : i))
      }
    } catch {}
    setDeepAnalyzing(null)
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
              <SelectItem value="fitScore">Fit Score순</SelectItem>
              <SelectItem value="engagementRate">ERF순</SelectItem>
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
                <TableHead className="text-right">Fit</TableHead>
                <TableHead className="text-right">ERF%</TableHead>
                <TableHead className="text-right">팔로워</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>메모</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">로딩중...</TableCell>
                </TableRow>
              ) : influencers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">후보 데이터가 없습니다. 먼저 수집 후 탐색에서 프로필을 분석하세요.</TableCell>
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
                        <a href={inf.profileUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium" onClick={e => e.stopPropagation()}>
                          @{inf.username}
                        </a>
                        {inf.fullname && <div className="text-xs text-muted-foreground">{inf.fullname}</div>}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`font-bold ${inf.fitScore >= 70 ? 'text-green-600' : inf.fitScore >= 40 ? 'text-yellow-600' : 'text-muted-foreground'}`}>
                          {inf.fitScore}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {inf.engagementRate > 0 ? `${inf.engagementRate}%` : '-'}
                      </TableCell>
                      <TableCell className="text-right">{inf.followers > 0 ? inf.followers.toLocaleString() : '-'}</TableCell>
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
                        <TableCell colSpan={7} className="bg-muted/50 px-8 py-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                            <div>
                              <div className="text-muted-foreground text-xs">Fit Score</div>
                              <div className="font-medium text-lg">{inf.fitScore}/100</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground text-xs">ERF (팔로워 대비)</div>
                              <div className="font-medium">{inf.engagementRate > 0 ? `${inf.engagementRate}%` : '미분석'}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground text-xs">팔로워</div>
                              <div className="font-medium">{inf.followers > 0 ? inf.followers.toLocaleString() : '미수집'}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground text-xs">팔로잉 비율</div>
                              <div className="font-medium">{inf.followerFollowingRatio > 0 ? `${inf.followerFollowingRatio}x` : '미수집'}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground text-xs">댓글/좋아요 비율</div>
                              <div className="font-medium">{inf.commentLikeRatio > 0 ? `${(inf.commentLikeRatio * 100).toFixed(1)}%` : '-'}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground text-xs">포스팅 빈도</div>
                              <div className="font-medium">{inf.postingFrequency > 0 ? `주 ${inf.postingFrequency}회` : '-'}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground text-xs">감지 언어</div>
                              <div className="font-medium">{inf.detectedLanguage || '-'}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground text-xs">콘텐츠 관련성</div>
                              <div className="font-medium">{inf.contentRelevance > 0 ? `${inf.contentRelevance}/100` : '-'}</div>
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
                          {/* 심층 분석 */}
                          <div className="mt-3 pt-3 border-t">
                            {inf.deepAnalyzedAt ? (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-semibold text-muted-foreground">심층 분석 결과</span>
                                  <span className="text-xs text-muted-foreground">({new Date(inf.deepAnalyzedAt).toLocaleDateString('ko-KR')})</span>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                  <div>
                                    <div className="text-muted-foreground text-xs">댓글 품질</div>
                                    <div className="font-medium">{(inf.commentQualityScore * 100).toFixed(0)}%</div>
                                  </div>
                                  {(() => {
                                    try {
                                      const dist = JSON.parse(inf.commentLangDistribution || '{}')
                                      const entries = Object.entries(dist).sort(([,a]: any, [,b]: any) => b - a)
                                      return entries.length > 0 ? (
                                        <div className="col-span-2 md:col-span-3">
                                          <div className="text-muted-foreground text-xs">댓글 언어 분포</div>
                                          <div className="flex gap-2 mt-1">
                                            {entries.map(([lang, ratio]: any) => (
                                              <Badge key={lang} variant="secondary" className="text-xs">
                                                {lang}: {(ratio * 100).toFixed(0)}%
                                              </Badge>
                                            ))}
                                          </div>
                                        </div>
                                      ) : null
                                    } catch { return null }
                                  })()}
                                </div>
                                <Button
                                  variant="outline" size="sm"
                                  onClick={() => deepAnalyze(inf.username)}
                                  disabled={deepAnalyzing === inf.username}
                                >
                                  {deepAnalyzing === inf.username ? '분석중...' : '재분석'}
                                </Button>
                              </div>
                            ) : (
                              <Button
                                variant="outline" size="sm"
                                onClick={() => deepAnalyze(inf.username)}
                                disabled={deepAnalyzing === inf.username}
                              >
                                {deepAnalyzing === inf.username ? '릴스/댓글 분석중...' : '심층 분석 (릴스+댓글)'}
                              </Button>
                            )}
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
