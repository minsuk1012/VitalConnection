'use client'

import { useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious,
} from '@/components/ui/pagination'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet'

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
  reelCount: number
  avgReelViews: number
  avgReelPlays: number
}

export default function CandidatesTab() {
  const [influencers, setInfluencers] = useState<Influencer[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [sortBy, setSortBy] = useState('fitScore')
  const [filterStatus, setFilterStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [sheetTarget, setSheetTarget] = useState<Influencer | null>(null)
  const [memoValue, setMemoValue] = useState('')
  const [deepAnalyzing, setDeepAnalyzing] = useState<string | null>(null)
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({})
  const [reelsData, setReelsData] = useState<Record<string, any[]>>({})
  const [selectedReel, setSelectedReel] = useState<any | null>(null)
  const [reelComments, setReelComments] = useState<any[]>([])
  const [sheetTab, setSheetTab] = useState<'profile' | 'reels' | 'posts'>('profile')

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
    setStatusCounts(data.statusCounts || {})
    setLoading(false)
  }, [page, sortBy, filterStatus])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    if (sheetTarget && !reelsData[sheetTarget.username]) {
      fetch(`/api/instagram/reels?username=${sheetTarget.username}`)
        .then(r => r.json())
        .then(d => {
          if (d.reels) setReelsData(prev => ({ ...prev, [sheetTarget.username]: d.reels }))
        })
        .catch(() => {})
    }
  }, [sheetTarget])

  async function updateStatus(username: string, status: string) {
    await fetch('/api/instagram/candidates', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, status }),
    })
    setInfluencers(prev => prev.map(i => i.username === username ? { ...i, status } : i))
  }

  async function saveMemo() {
    if (!sheetTarget) return
    await fetch('/api/instagram/candidates', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: sheetTarget.username, memo: memoValue }),
    })
    setInfluencers(prev => prev.map(i => i.username === sheetTarget.username ? { ...i, memo: memoValue } : i))
    setSheetTarget(null)
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

  async function openReelDetail(reel: any) {
    setSelectedReel(reel)
    setReelComments([])
    try {
      const res = await fetch(`/api/instagram/reels?reelId=${reel.id}`)
      const data = await res.json()
      setReelComments(data.comments || [])
    } catch {}
  }

  function closeReelDetail() {
    setSelectedReel(null)
    setReelComments([])
  }

  function openMemoSheet(inf: Influencer) {
    setSheetTarget(inf)
    setMemoValue(inf.memo || '')
  }

  function exportCSV() {
    window.open('/api/instagram/influencers/export')
  }

  return (
    <div className="space-y-4">
      {/* 지표 계산 방법 */}
      <Collapsible>
        <CollapsibleTrigger className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          지표 계산 방법 ▸
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Card className="mt-2">
            <CardContent className="pt-4 space-y-4 text-sm">
              <div>
                <div className="font-medium mb-1">Fit Score (0~100)</div>
                <p className="text-xs text-muted-foreground mb-2">의료관광 인플루언서 종합 적합도. 6가지 요소의 가중 평균.</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                  <div className="rounded border px-2 py-1.5">
                    <span className="font-medium">ERF</span> <span className="text-muted-foreground">25%</span>
                    <div className="text-muted-foreground">팔로워 대비 참여율</div>
                  </div>
                  <div className="rounded border px-2 py-1.5">
                    <span className="font-medium">콘텐츠 관련성</span> <span className="text-muted-foreground">25%</span>
                    <div className="text-muted-foreground">의료관광 키워드 매칭</div>
                  </div>
                  <div className="rounded border px-2 py-1.5">
                    <span className="font-medium">시장 적합도</span> <span className="text-muted-foreground">20%</span>
                    <div className="text-muted-foreground">타겟 언어 + 한국 위치</div>
                  </div>
                  <div className="rounded border px-2 py-1.5">
                    <span className="font-medium">신뢰도</span> <span className="text-muted-foreground">15%</span>
                    <div className="text-muted-foreground">팔로워/팔로잉, 바이오, 비즈니스</div>
                  </div>
                  <div className="rounded border px-2 py-1.5">
                    <span className="font-medium">품질</span> <span className="text-muted-foreground">10%</span>
                    <div className="text-muted-foreground">댓글/좋아요 비율, 일관성</div>
                  </div>
                  <div className="rounded border px-2 py-1.5">
                    <span className="font-medium">활동성</span> <span className="text-muted-foreground">5%</span>
                    <div className="text-muted-foreground">포스팅 빈도, 최근 활동</div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="font-medium mb-1">ERF (Engagement Rate by Followers)</div>
                  <p className="text-xs text-muted-foreground">
                    (평균 좋아요 + 평균 댓글) ÷ 팔로워 × 100
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    벤치마크: ~1만 팔로워 5% / ~10만 3% / ~100만 1.5% / 100만+ 1%
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    ※ 프로필 정보 수집 필요 (팔로워 수)
                  </p>
                </div>
                <div>
                  <div className="font-medium mb-1">평균 Engagement</div>
                  <p className="text-xs text-muted-foreground">
                    수집된 게시물의 평균 (좋아요 + 댓글)
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    팔로워 수와 무관한 절대 참여 수치
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      <div className="flex gap-2 flex-wrap">
        {STATUSES.map(s => (
          <button
            key={s}
            onClick={() => { setFilterStatus(filterStatus === s ? '' : s); setPage(1) }}
            className={cn(
              'px-3 py-1.5 rounded-lg border text-sm transition-colors',
              filterStatus === s ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-muted',
            )}
          >
            {s} <span className="font-bold ml-1">{statusCounts[s] || 0}</span>
          </button>
        ))}
      </div>

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
              <SelectItem value="avgEngagement">Engagement순</SelectItem>
              <SelectItem value="likes">평균 좋아요순</SelectItem>
              <SelectItem value="comments">평균 댓글순</SelectItem>
              <SelectItem value="posts">게시물 수순</SelectItem>
              <SelectItem value="reelViews">릴스 조회순</SelectItem>
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
                <TableHead>계정</TableHead>
                <TableHead className="text-right">팔로워</TableHead>
                <TableHead className="text-right">게시물</TableHead>
                <TableHead className="text-right">릴스</TableHead>
                <TableHead className="text-right">평균 조회</TableHead>
                <TableHead className="text-right">평균 좋아요</TableHead>
                <TableHead className="text-right">평균 댓글</TableHead>
                <TableHead className="text-right">Fit</TableHead>
                <TableHead className="text-right">ERF</TableHead>
                <TableHead className="text-right">Engagement</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>메모</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center text-muted-foreground py-8">로딩중...</TableCell>
                </TableRow>
              ) : influencers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center text-muted-foreground py-8">후보 데이터가 없습니다. 먼저 수집 후 탐색에서 프로필을 분석하세요.</TableCell>
                </TableRow>
              ) : (
                influencers.map((inf) => (
                    <TableRow
                      key={inf.username}
                      onClick={() => openMemoSheet(inf)}
                      className="cursor-pointer"
                    >
                      <TableCell>
                        <a href={inf.profileUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium" onClick={e => e.stopPropagation()}>
                          @{inf.username}
                        </a>
                        {inf.fullname && <div className="text-xs text-muted-foreground">{inf.fullname}</div>}
                      </TableCell>
                      <TableCell className="text-right">{inf.followers > 0 ? inf.followers.toLocaleString() : '-'}</TableCell>
                      <TableCell className="text-right">{inf.postCount > 0 ? inf.postCount.toLocaleString() : '-'}</TableCell>
                      <TableCell className="text-right">{inf.reelCount > 0 ? inf.reelCount : '-'}</TableCell>
                      <TableCell className="text-right">{inf.avgReelViews > 0 ? Math.round(inf.avgReelViews).toLocaleString() : '-'}</TableCell>
                      <TableCell className="text-right">{inf.avgLikes > 0 ? Math.round(inf.avgLikes).toLocaleString() : '-'}</TableCell>
                      <TableCell className="text-right">{inf.avgComments > 0 ? Math.round(inf.avgComments).toLocaleString() : '-'}</TableCell>
                      <TableCell className="text-right">
                        <span className={`font-medium ${inf.fitScore >= 70 ? 'text-green-600' : inf.fitScore >= 40 ? 'text-yellow-600' : 'text-muted-foreground'}`}>
                          {inf.fitScore}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {inf.engagementRate > 0 ? `${inf.engagementRate.toFixed(2)}%` : '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium">{inf.avgEngagement > 0 ? Math.round(inf.avgEngagement).toLocaleString() : '-'}</TableCell>
                      <TableCell>
                        <Badge variant={
                          inf.status === '확정' ? 'default' :
                          inf.status === '연락중' ? 'default' :
                          inf.status === '후보' ? 'secondary' :
                          inf.status === '제외' ? 'destructive' : 'outline'
                        } className={cn(
                          'text-xs',
                          inf.status === '확정' && 'bg-green-600',
                          inf.status === '연락중' && 'bg-primary',
                        )}>
                          {inf.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground truncate max-w-[120px]">
                        {inf.memo || '-'}
                      </TableCell>
                    </TableRow>
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

      {/* 인플루언서 상세 Sheet */}
      <Sheet open={!!sheetTarget} onOpenChange={open => { if (!open) { setSheetTarget(null); setSheetTab('profile'); setSelectedReel(null) } }}>
        <SheetContent side="right" className="overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>@{sheetTarget?.username}</SheetTitle>
            <SheetDescription>{sheetTarget?.fullname || ''}</SheetDescription>
          </SheetHeader>

          {/* 전체 페이지로 보기 */}
          <a href={`/admin/instagram/candidates/${sheetTarget?.username}`} className="block px-4 text-xs text-primary hover:underline mb-2">
            전체 페이지로 보기 →
          </a>

          {/* 탭 버튼 */}
          <div className="flex gap-1 px-4 mb-2">
            {(['profile', 'reels', 'posts'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => { setSheetTab(tab); setSelectedReel(null) }}
                className={`px-3 py-1.5 rounded-md text-sm transition-colors ${sheetTab === tab ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}
              >
                {{ profile: '프로필', reels: '릴스', posts: '게시물' }[tab]}
              </button>
            ))}
          </div>

          <div className="px-4 space-y-4">
            {sheetTarget && (
              <>
                {/* 프로필 탭 */}
                {sheetTab === 'profile' && (
                  <>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-xs text-muted-foreground">Fit Score</div>
                        <div className="font-medium">{sheetTarget.fitScore}/100</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">ERF</div>
                        <div className="font-medium">{sheetTarget.engagementRate > 0 ? `${sheetTarget.engagementRate.toFixed(2)}%` : '-'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">팔로워</div>
                        <div className="font-medium">{sheetTarget.followers > 0 ? sheetTarget.followers.toLocaleString() : '-'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">상태</div>
                        <Select value={sheetTarget.status} onValueChange={v => {
                          updateStatus(sheetTarget.username, v)
                          setSheetTarget({ ...sheetTarget, status: v })
                        }}>
                          <SelectTrigger className="h-7 text-xs w-[100px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">팔로잉 비율</div>
                        <div className="font-medium">{sheetTarget.followerFollowingRatio > 0 ? `${sheetTarget.followerFollowingRatio.toFixed(1)}x` : '-'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">댓글/좋아요</div>
                        <div className="font-medium">{sheetTarget.commentLikeRatio > 0 ? `${(sheetTarget.commentLikeRatio * 100).toFixed(1)}%` : '-'}</div>
                      </div>
                    </div>
                    {sheetTarget.bio && (
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">바이오</div>
                        <p className="text-sm">{sheetTarget.bio}</p>
                      </div>
                    )}
                    {sheetTarget.hashtags?.length > 0 && (
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">해시태그</div>
                        <div className="flex flex-wrap gap-1">
                          {sheetTarget.hashtags.map((h: string) => (
                            <Badge key={h} variant="secondary" className="text-xs">#{h}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {sheetTarget.deepAnalyzedAt && (
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">심층 분석 ({new Date(sheetTarget.deepAnalyzedAt).toLocaleDateString('ko-KR')})</div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-xs text-muted-foreground">댓글 품질: </span>
                            <span className="font-medium">{(sheetTarget.commentQualityScore * 100).toFixed(0)}%</span>
                          </div>
                          {(() => {
                            try {
                              const dist = JSON.parse(sheetTarget.commentLangDistribution || '{}')
                              const entries = Object.entries(dist).sort(([,a]: any, [,b]: any) => b - a).slice(0, 3)
                              return entries.length > 0 ? (
                                <div>
                                  <span className="text-xs text-muted-foreground">언어: </span>
                                  <span className="font-medium">{entries.map(([lang, ratio]: any) => `${lang} ${(ratio * 100).toFixed(0)}%`).join(', ')}</span>
                                </div>
                              ) : null
                            } catch { return null }
                          })()}
                        </div>
                      </div>
                    )}
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">메모</Label>
                      <textarea
                        value={memoValue}
                        onChange={e => setMemoValue(e.target.value)}
                        placeholder="메모를 입력하세요..."
                        className="w-full min-h-[120px] rounded-lg border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none resize-y"
                      />
                      <Button className="mt-2 w-full" onClick={saveMemo}>저장</Button>
                    </div>
                    <div className="border-t pt-4">
                      <Button variant="outline" size="sm" className="w-full" onClick={async () => {
                        await fetch('/api/instagram/collect-profiles', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ usernames: [sheetTarget.username] }),
                        })
                        fetchData()
                        const updated = await fetch(`/api/instagram/influencers?page=1`).then(r => r.json())
                        const found = (updated.rows || []).find((i: any) => i.username === sheetTarget.username)
                        if (found) setSheetTarget({ ...sheetTarget, ...found, hashtags: typeof found.hashtags === 'string' ? JSON.parse(found.hashtags || '[]') : found.hashtags })
                      }}>
                        프로필 최신화
                      </Button>
                    </div>
                  </>
                )}

                {/* 릴스 탭 */}
                {sheetTab === 'reels' && (
                  <>
                    <span className="text-sm text-muted-foreground">{(reelsData[sheetTarget.username] || []).length}건</span>
                    {(reelsData[sheetTarget.username] || []).length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">릴스 데이터가 없습니다. 전체 페이지에서 수집하세요.</p>
                    ) : !selectedReel ? (
                      <div className="space-y-2">
                        {reelsData[sheetTarget.username].map((reel: any, i: number) => (
                          <button key={i} onClick={() => openReelDetail(reel)} className="flex items-center gap-3 w-full text-left hover:bg-muted rounded-lg p-2 transition-colors">
                            <div className="min-w-0 flex-1">
                              <p className="text-xs truncate">{(reel.caption || '').slice(0, 60) || '릴스'}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{(reel.views || 0).toLocaleString()} views</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <button onClick={closeReelDetail} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                          ← 릴스 목록
                        </button>
                        {selectedReel.videoUrl ? (
                          <div className="rounded-lg overflow-hidden bg-black aspect-[9/16] max-h-[280px]">
                            <video src={selectedReel.videoUrl} controls playsInline preload="metadata" poster={selectedReel.displayUrl || undefined} className="w-full h-full object-contain" />
                          </div>
                        ) : null}
                        <div className="grid grid-cols-4 gap-1 text-center text-xs">
                          <div><div className="font-semibold">{(selectedReel.views || 0).toLocaleString()}</div><div className="text-muted-foreground">조회</div></div>
                          <div><div className="font-semibold">{(selectedReel.plays || 0).toLocaleString()}</div><div className="text-muted-foreground">재생</div></div>
                          <div><div className="font-semibold">{selectedReel.likes > 0 ? selectedReel.likes.toLocaleString() : '-'}</div><div className="text-muted-foreground">좋아요</div></div>
                          <div><div className="font-semibold">{(selectedReel.commentsCount || 0).toLocaleString()}</div><div className="text-muted-foreground">댓글</div></div>
                        </div>
                        {selectedReel.caption && (
                          <p className="text-xs whitespace-pre-line">{selectedReel.caption.length > 150 ? selectedReel.caption.slice(0, 150) + '...' : selectedReel.caption}</p>
                        )}
                        <a href={selectedReel.reelUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">인스타그램에서 보기 →</a>
                        {reelComments.length > 0 && (
                          <div className="border-t pt-2">
                            <div className="text-xs font-medium mb-2">댓글 ({reelComments.length})</div>
                            <div className="space-y-2">
                              {reelComments.slice(0, 5).map((c: any) => (
                                <div key={c.id}>
                                  <span className="text-xs font-medium">{c.commenterUsername || '익명'}</span>
                                  {c.detectedLanguage && <Badge variant="secondary" className="text-[10px] px-1 py-0 ml-1">{c.detectedLanguage}</Badge>}
                                  <p className="text-xs mt-0.5">{c.commentText}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* 게시물 탭 */}
                {sheetTab === 'posts' && (
                  <>
                    <span className="text-sm text-muted-foreground">{(sheetTarget.samplePosts || []).length}건</span>
                    {(sheetTarget.samplePosts || []).length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">게시물 데이터가 없습니다. 전체 페이지에서 수집하세요.</p>
                    ) : (
                      <div className="space-y-2">
                        {sheetTarget.samplePosts.map((post: any, i: number) => (
                          <a key={i} href={post.url} target="_blank" rel="noopener noreferrer" className="block hover:bg-muted rounded-lg p-2 transition-colors">
                            <p className="text-xs truncate">{(post.caption || '').slice(0, 80) || post.url}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">좋아요 {post.likes.toLocaleString()} · 댓글 {post.comments.toLocaleString()}</p>
                          </a>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
