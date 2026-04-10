'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

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

type Tab = 'profile' | 'reels' | 'posts'

function PostImageCarousel({ images }: { images: string[] }) {
  const [current, setCurrent] = useState(0)
  if (images.length === 0) return null
  return (
    <div className="relative rounded-lg overflow-hidden">
      <img src={images[current]} alt="" className="w-full max-h-[360px] object-contain" loading="lazy" />
      {images.length > 1 && (
        <>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((_, i) => (
              <button key={i} onClick={() => setCurrent(i)} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === current ? 'bg-white' : 'bg-white/40'}`} />
            ))}
          </div>
          {current > 0 && (
            <button onClick={() => setCurrent(current - 1)} className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center text-sm">‹</button>
          )}
          {current < images.length - 1 && (
            <button onClick={() => setCurrent(current + 1)} className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center text-sm">›</button>
          )}
          <div className="absolute top-3 right-3 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">{current + 1}/{images.length}</div>
        </>
      )}
    </div>
  )
}

function HashtagList({ hashtags }: { hashtags: string[] }) {
  const [expanded, setExpanded] = useState(false)
  const LIMIT = 5
  const visible = expanded ? hashtags : hashtags.slice(0, LIMIT)
  const hasMore = hashtags.length > LIMIT

  return (
    <div>
      <div className="text-xs text-muted-foreground mb-1">해시태그 ({hashtags.length})</div>
      <div className="flex flex-wrap gap-1">
        {visible.map((h: string) => (
          <Badge key={h} variant="secondary" className="text-xs">#{h}</Badge>
        ))}
        {hasMore && (
          <button onClick={() => setExpanded(!expanded)} className="text-xs text-muted-foreground hover:text-foreground">
            {expanded ? '접기' : `+${hashtags.length - LIMIT}개 더보기`}
          </button>
        )}
      </div>
    </div>
  )
}

export default function CandidateDetailPage() {
  const params = useParams()
  const username = params.username as string

  const [influencer, setInfluencer] = useState<Influencer | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('reels')

  // Reels state
  const [reels, setReels] = useState<any[]>([])
  const [selectedReel, setSelectedReel] = useState<any | null>(null)
  const [reelComments, setReelComments] = useState<any[]>([])
  const [reelLimit, setReelLimit] = useState(10)

  // Posts state
  const [userPosts, setUserPosts] = useState<any[]>([])
  const [selectedPost, setSelectedPost] = useState<any | null>(null)

  // Balance state
  const [balance, setBalance] = useState<number | null>(null)

  // Memo state
  const [memoValue, setMemoValue] = useState('')
  const [savingMemo, setSavingMemo] = useState(false)

  // Profile refresh state
  const [refreshingProfile, setRefreshingProfile] = useState(false)

  // Activities state
  const [activities, setActivities] = useState<any[]>([])

  // 수집 모달
  const [collectModal, setCollectModal] = useState<'reels' | 'posts' | null>(null)
  const [collectStatus, setCollectStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [collectError, setCollectError] = useState('')
  const [collectResult, setCollectResult] = useState('')

  async function fetchInfluencer() {
    const res = await fetch(`/api/instagram/influencers?page=1&limit=100`)
    const data = await res.json()
    const found = (data.rows || []).find((i: any) => i.username === username)
    if (found) {
      const inf = {
        ...found,
        hashtags: typeof found.hashtags === 'string' ? JSON.parse(found.hashtags || '[]') : (found.hashtags || []),
        samplePosts: typeof found.samplePosts === 'string' ? JSON.parse(found.samplePosts || '[]') : (found.samplePosts || []),
      }
      setInfluencer(inf)
      setMemoValue(inf.memo || '')
    }
    setLoading(false)
  }

  async function fetchReels() {
    const res = await fetch(`/api/instagram/reels?username=${username}`)
    const data = await res.json()
    setReels(data.reels || [])
  }

  async function fetchUserPosts() {
    const res = await fetch(`/api/instagram/results?username=${username}`)
    const data = await res.json()
    setUserPosts(data.posts || [])
  }

  async function fetchBalance() {
    try {
      const res = await fetch('/api/admin/apify-keys')
      const data = await res.json()
      const total = (data.keys || []).reduce((sum: number, k: any) => sum + (k.remaining || 0), 0)
      setBalance(total)
    } catch {}
  }

  async function fetchActivities() {
    try {
      const res = await fetch(`/api/instagram/activities?username=${username}`)
      const data = await res.json()
      setActivities(data.activities || [])
    } catch {}
  }

  useEffect(() => {
    fetchInfluencer()
    fetchReels()
    fetchUserPosts()
    fetchBalance()
    fetchActivities()
  }, [username])

  async function updateStatus(status: string) {
    if (!influencer) return
    await fetch('/api/instagram/candidates', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, status }),
    })
    setInfluencer(prev => prev ? { ...prev, status } : null)
  }

  async function saveMemo() {
    if (!influencer) return
    setSavingMemo(true)
    await fetch('/api/instagram/candidates', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, memo: memoValue }),
    })
    setInfluencer(prev => prev ? { ...prev, memo: memoValue } : null)
    setSavingMemo(false)
  }

  async function refreshProfile() {
    setRefreshingProfile(true)
    await fetch('/api/instagram/collect-profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernames: [username] }),
    })
    await fetchInfluencer()
    await fetchActivities()
    setRefreshingProfile(false)
  }

  async function executeCollect() {
    setCollectStatus('loading')
    setCollectError('')
    setCollectResult('')
    try {
      if (collectModal === 'reels') {
        const res = await fetch('/api/instagram/collect-reels', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, limit: reelLimit }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || '수집 실패')
        setCollectResult(`릴스 ${data.reelsInserted ?? data.inserted ?? 0}건 수집 완료`)
        await fetchReels()
      } else if (collectModal === 'posts') {
        const res = await fetch('/api/instagram/collect-profiles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ usernames: [username] }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || '수집 실패')
        const result = data.results?.[0]
        if (result?.status === 'error') throw new Error(result.error)
        setCollectResult(`최근 게시물 ${result?.postsInserted ?? 0}건 수집 완료 (프로필 최신화 포함, 중복 제외)`)
        await fetchInfluencer()
        await fetchUserPosts()
      }
      await fetchBalance()
      await fetchActivities()
      setCollectStatus('success')
    } catch (err: any) {
      setCollectError(err.message)
      setCollectStatus('error')
    }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">로딩중...</p>
      </div>
    )
  }

  if (!influencer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-muted-foreground">후보를 찾을 수 없습니다: @{username}</p>
        <Link href="/admin/instagram/candidates">
          <Button variant="outline">← 후보 관리로 돌아가기</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 py-4 px-4 md:gap-6 md:py-6 lg:px-6">
      {/* 상단 breadcrumb */}
      <div className="flex items-center gap-2">
        <Link href="/admin/instagram/candidates" className="text-sm text-muted-foreground hover:text-foreground">
          ← 후보 관리
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="font-medium">@{username}</span>
        {influencer.fullname && (
          <span className="text-sm text-muted-foreground">{influencer.fullname}</span>
        )}
      </div>

      {/* 2컬럼 레이아웃 */}
      <div className="flex gap-6 items-start">
        {/* 왼쪽 사이드바 */}
        <Card className="w-72 shrink-0 h-fit">
          <CardContent className="space-y-4 pt-4">
            {/* 주요 지표 */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">Fit Score</div>
                <div className={`font-medium ${influencer.fitScore >= 70 ? 'text-green-600' : influencer.fitScore >= 40 ? 'text-yellow-600' : ''}`}>
                  {influencer.fitScore}/100
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">ERF</div>
                <div className="font-medium">{influencer.engagementRate > 0 ? `${influencer.engagementRate.toFixed(2)}%` : '-'}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">팔로워</div>
                <div className="font-medium">{influencer.followers > 0 ? influencer.followers.toLocaleString() : '-'}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">릴스</div>
                <div className="font-medium">{influencer.reelCount > 0 ? influencer.reelCount : '-'}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">게시물</div>
                <div className="font-medium">{influencer.postCount > 0 ? influencer.postCount : '-'}</div>
              </div>
            </div>

            <Separator />

            {/* 상태 */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">상태</Label>
              <Select value={influencer.status} onValueChange={updateStatus}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* 바이오 */}
            {influencer.bio && (
              <>
                <Separator />
                <div>
                  <div className="text-xs text-muted-foreground mb-1">바이오</div>
                  <p className="text-xs leading-relaxed">{influencer.bio}</p>
                </div>
              </>
            )}

            {/* 해시태그 */}
            {influencer.hashtags?.length > 0 && (
              <>
                <Separator />
                <HashtagList hashtags={influencer.hashtags} />
              </>
            )}

            <Separator />

            {/* 메모 */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">메모</Label>
              <textarea
                value={memoValue}
                onChange={e => setMemoValue(e.target.value)}
                placeholder="메모를 입력하세요..."
                className="w-full min-h-[100px] rounded-lg border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none resize-y"
              />
              <Button className="mt-2 w-full" size="sm" onClick={saveMemo} disabled={savingMemo}>
                {savingMemo ? '저장중...' : '저장'}
              </Button>
            </div>

            <Separator />

            {/* 수집 액션 */}
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">데이터 수집</div>
              <Button variant="outline" size="sm" className="w-full" onClick={refreshProfile} disabled={refreshingProfile}>
                {refreshingProfile ? '수집중...' : '프로필 최신화'}
              </Button>
              <Button variant="outline" size="sm" className="w-full" onClick={() => setCollectModal('reels')}>
                릴스 수집
              </Button>
              <Button variant="outline" size="sm" className="w-full" onClick={() => setCollectModal('posts')}>
                게시물 수집
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 오른쪽 메인 */}
        <Tabs
          value={tab}
          orientation="horizontal"
          onValueChange={(v) => { setTab(v as Tab); setSelectedReel(null); setSelectedPost(null) }}
          className="flex-1 min-w-0 block"
        >
          <div className="flex items-center gap-3 mb-4">
            <TabsList>
              <TabsTrigger value="profile">프로필</TabsTrigger>
              <TabsTrigger value="reels">릴스</TabsTrigger>
              <TabsTrigger value="posts">게시물</TabsTrigger>
            </TabsList>
            <span className="text-xs text-muted-foreground ml-auto">
              {tab === 'profile' && `팔로워 ${influencer.followers > 0 ? influencer.followers.toLocaleString() : '-'}`}
              {tab === 'reels' && `${reels.length}건`}
              {tab === 'posts' && `${userPosts.length}건`}
            </span>
          </div>
            {/* 프로필 탭 */}
            <TabsContent value="profile">
              <div className="space-y-4 mt-4">
                <Card>
                  <CardContent className="pt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-xs text-muted-foreground">팔로잉 비율</div>
                      <div className="font-medium">{influencer.followerFollowingRatio > 0 ? `${influencer.followerFollowingRatio.toFixed(1)}x` : '-'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">댓글/좋아요</div>
                      <div className="font-medium">{influencer.commentLikeRatio > 0 ? `${(influencer.commentLikeRatio * 100).toFixed(1)}%` : '-'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">평균 좋아요</div>
                      <div className="font-medium">{influencer.avgLikes > 0 ? Math.round(influencer.avgLikes).toLocaleString() : '-'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">평균 댓글</div>
                      <div className="font-medium">{influencer.avgComments > 0 ? Math.round(influencer.avgComments).toLocaleString() : '-'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">평균 Engagement</div>
                      <div className="font-medium">{influencer.avgEngagement > 0 ? Math.round(influencer.avgEngagement).toLocaleString() : '-'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">평균 릴스 조회</div>
                      <div className="font-medium">{influencer.avgReelViews > 0 ? Math.round(influencer.avgReelViews).toLocaleString() : '-'}</div>
                    </div>
                  </CardContent>
                </Card>
                {influencer.deepAnalyzedAt && (
                  <Card>
                    <CardContent className="pt-4 space-y-2 text-sm">
                      <div className="text-xs text-muted-foreground font-medium">심층 분석 ({new Date(influencer.deepAnalyzedAt).toLocaleDateString('ko-KR')})</div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-xs text-muted-foreground">댓글 품질: </span>
                          <span className="font-medium">{(influencer.commentQualityScore * 100).toFixed(0)}%</span>
                        </div>
                        {(() => {
                          try {
                            const dist = JSON.parse(influencer.commentLangDistribution || '{}')
                            const entries = Object.entries(dist).sort(([, a]: any, [, b]: any) => b - a).slice(0, 3)
                            return entries.length > 0 ? (
                              <div>
                                <span className="text-xs text-muted-foreground">언어: </span>
                                <span className="font-medium text-xs">{entries.map(([lang, ratio]: any) => `${lang} ${(ratio * 100).toFixed(0)}%`).join(', ')}</span>
                              </div>
                            ) : null
                          } catch { return null }
                        })()}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* 수집 이력 */}
                <Card>
                  <CardContent className="pt-4 space-y-2">
                    <div className="text-xs text-muted-foreground font-medium">수집 이력</div>
                    {activities.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2">이력이 없습니다.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {activities.map((a: any) => {
                          const actionLabels: Record<string, string> = {
                            profile_refresh: '프로필 최신화',
                            reels_collect: '릴스 수집',
                            posts_collect: '게시물 수집',
                            deep_analyze: '심층 분석',
                            auto_discover: '자동 발견',
                          }
                          const detail = (() => { try { return JSON.parse(a.detail || '{}') } catch { return {} } })()
                          const detailText = (() => {
                            if (a.action === 'auto_discover' && detail.hashtag) return `#${detail.hashtag} (${detail.posts || 0}건)`
                            if (a.action === 'reels_collect') return `${detail.inserted || 0}건${detail.refreshed ? ' (새로고침)' : ''}`
                            if (a.action === 'profile_refresh' && detail.postsInserted) return `게시물 ${detail.postsInserted}건`
                            if (a.action === 'deep_analyze') return `릴스 ${detail.reels || 0}, 댓글 ${detail.comments || 0}`
                            return ''
                          })()
                          return (
                            <div key={a.id} className="flex items-center gap-2 text-xs">
                              <span className="text-muted-foreground w-[70px] shrink-0">
                                {new Date(a.createdAt).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}
                              </span>
                              <span className="font-medium">{actionLabels[a.action] || a.action}</span>
                              {detailText && <span className="text-muted-foreground">— {detailText}</span>}
                              <Badge variant={a.source === 'explore' ? 'secondary' : 'outline'} className="text-[10px] px-1.5 py-0 ml-auto">
                                {a.source === 'explore' ? '탐색' : '후보관리'}
                              </Badge>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* 릴스 탭 */}
            <TabsContent value="reels">
              <div className="space-y-4 mt-4">

                {reels.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-12">릴스 데이터가 없습니다. 릴스 수집을 실행하세요.</p>
                ) : !selectedReel ? (
                  <div className="grid grid-cols-1 gap-2 ">
                    {reels.map((reel: any, i: number) => (
                      <Card key={i} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => openReelDetail(reel)}>
                        <CardContent className="p-3">
                          <p className="text-sm truncate">{(reel.caption || '').slice(0, 80) || '릴스'}</p>
                          <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                            <span>{(reel.views || 0).toLocaleString()} 조회</span>
                            <span>{(reel.plays || 0).toLocaleString()} 재생</span>
                            <span>{(reel.likes || 0).toLocaleString()} 좋아요</span>
                            <span>{(reel.commentsCount || 0).toLocaleString()} 댓글</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4 max-w-lg">
                    <button
                      onClick={() => { setSelectedReel(null); setReelComments([]) }}
                      className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
                    >
                      ← 릴스 목록
                    </button>
                    {selectedReel.videoUrl ? (
                      <div className="rounded-lg overflow-hidden bg-black aspect-[9/16] max-h-[400px]">
                        <video
                          src={selectedReel.videoUrl}
                          controls
                          playsInline
                          preload="metadata"
                          poster={selectedReel.displayUrl || undefined}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    ) : null}
                    <Card>
                      <CardContent className="grid grid-cols-4 gap-2 text-center py-3">
                        <div><div className="font-semibold">{(selectedReel.views || 0).toLocaleString()}</div><div className="text-muted-foreground text-xs">조회</div></div>
                        <div><div className="font-semibold">{(selectedReel.plays || 0).toLocaleString()}</div><div className="text-muted-foreground text-xs">재생</div></div>
                        <div><div className="font-semibold">{selectedReel.likes > 0 ? selectedReel.likes.toLocaleString() : '-'}</div><div className="text-muted-foreground text-xs">좋아요</div></div>
                        <div><div className="font-semibold">{(selectedReel.commentsCount || 0).toLocaleString()}</div><div className="text-muted-foreground text-xs">댓글</div></div>
                      </CardContent>
                    </Card>
                    {selectedReel.caption && (
                      <p className="text-sm whitespace-pre-line">{selectedReel.caption.length > 200 ? selectedReel.caption.slice(0, 200) + '...' : selectedReel.caption}</p>
                    )}
                    <a href={selectedReel.reelUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                      인스타그램에서 보기 →
                    </a>
                    {reelComments.length > 0 && (
                      <div className="border-t pt-3">
                        <div className="text-sm font-medium mb-2">댓글 ({reelComments.length})</div>
                        <div className="space-y-2">
                          {reelComments.map((c: any) => (
                            <div key={c.id} className="text-sm">
                              <span className="font-medium">{c.commenterUsername || '익명'}</span>
                              {c.detectedLanguage && (
                                <Badge variant="secondary" className="text-xs px-1 py-0 ml-1">{c.detectedLanguage}</Badge>
                              )}
                              <p className="text-muted-foreground mt-0.5">{c.commentText}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* 게시물 탭 */}
            <TabsContent value="posts">
              <div className="space-y-4 mt-4">

                {userPosts.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-12">게시물 데이터가 없습니다. 게시물 수집을 실행하세요.</p>
                ) : selectedPost ? (
                  /* 게시물 상세 */
                  <div className="space-y-4 max-w-md">
                    <button onClick={() => setSelectedPost(null)} className="text-sm text-muted-foreground hover:text-foreground">← 게시물 목록</button>

                    {/* 이미지 캐러셀 */}
                    {(() => {
                      let imgs: string[] = []
                      try { imgs = JSON.parse(selectedPost.images || '[]') } catch {}
                      if (imgs.length === 0 && selectedPost.display_url) imgs = [selectedPost.display_url]
                      if (imgs.length === 0) return null
                      return <PostImageCarousel images={imgs} />
                    })()}

                    {/* 통계 */}
                    <Card>
                      <CardContent className="grid grid-cols-2 gap-2 text-center py-3">
                        <div>
                          <div className="text-base font-semibold">{(selectedPost.likes || 0).toLocaleString()}</div>
                          <div className="text-[11px] text-muted-foreground">좋아요</div>
                        </div>
                        <div>
                          <div className="text-base font-semibold">{(selectedPost.comments || 0).toLocaleString()}</div>
                          <div className="text-[11px] text-muted-foreground">댓글</div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* 메타 */}
                    <div className="flex flex-wrap items-center gap-2">
                      {selectedPost.post_type && <Badge variant="secondary">{selectedPost.post_type}</Badge>}
                      {selectedPost.location && <Badge variant="secondary">{selectedPost.location}</Badge>}
                      {selectedPost.post_timestamp && (
                        <span className="text-xs text-muted-foreground">
                          {new Date(selectedPost.post_timestamp).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </span>
                      )}
                      <a href={selectedPost.url} target="_blank" rel="noopener noreferrer" className="ml-auto text-xs text-primary hover:underline">인스타그램에서 보기 →</a>
                    </div>

                    {/* 캡션 */}
                    {selectedPost.caption && (
                      <p className="text-sm leading-relaxed whitespace-pre-line">{selectedPost.caption}</p>
                    )}

                    {/* 해시태그 */}
                    {(() => {
                      try {
                        const tags = JSON.parse(selectedPost.hashtags || '[]')
                        return tags.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {tags.map((t: string) => <Badge key={t} variant="secondary" className="text-xs">#{t}</Badge>)}
                          </div>
                        ) : null
                      } catch { return null }
                    })()}

                    {/* 첫 댓글 */}
                    {selectedPost.first_comment && (
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">첫 댓글</div>
                        <p className="text-sm">{selectedPost.first_comment}</p>
                      </div>
                    )}

                    {/* 최근 댓글 */}
                    {(() => {
                      try {
                        const comments = JSON.parse(selectedPost.latest_comments || '[]')
                        return comments.length > 0 ? (
                          <div className="border-t pt-3">
                            <div className="text-sm font-medium mb-2">댓글 ({comments.length})</div>
                            <div className="space-y-2">
                              {comments.slice(0, 5).map((c: any, i: number) => (
                                <div key={i}>
                                  <span className="text-sm font-medium">{c.ownerUsername || c.owner?.username || '?'}</span>
                                  <p className="text-sm mt-0.5">{(c.text || '').slice(0, 100)}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null
                      } catch { return null }
                    })()}
                  </div>
                ) : (
                  /* 게시물 목록 */
                  <div className="grid grid-cols-1 gap-2">
                    {userPosts.map((post: any, i: number) => (
                      <Card key={i} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setSelectedPost(post)}>
                        <CardContent className="p-3">
                          <p className="text-sm truncate">{(post.caption || '').slice(0, 100) || post.url}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            좋아요 {(post.likes || 0).toLocaleString()} · 댓글 {(post.comments || 0).toLocaleString()}
                            {post.post_timestamp && ` · ${new Date(post.post_timestamp).toLocaleDateString('ko-KR')}`}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
        </Tabs>
      </div>

      {/* 수집 모달 */}
      <AlertDialog open={!!collectModal} onOpenChange={open => { if (!open) { setCollectModal(null); setCollectStatus('idle') } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{collectModal === 'reels' ? '릴스 수집' : '게시물 수집'}</AlertDialogTitle>
            <AlertDialogDescription>@{username}의 {collectModal === 'reels' ? '릴스' : '게시물'}을 수집합니다.</AlertDialogDescription>
          </AlertDialogHeader>

          {collectStatus === 'idle' && (
            <div className="space-y-3 py-2">
              {collectModal === 'reels' ? (
                <div>
                  <Label className="text-sm mb-2 block">수집 건수</Label>
                  <ToggleGroup
                    value={[String(reelLimit)]}
                    onValueChange={(v) => { if (v.length > 0) setReelLimit(Number(v[v.length - 1])) }}
                    className="justify-start"
                  >
                    <ToggleGroupItem value="10" size="sm">10개</ToggleGroupItem>
                    <ToggleGroupItem value="20" size="sm">20개</ToggleGroupItem>
                    <ToggleGroupItem value="50" size="sm">50개</ToggleGroupItem>
                  </ToggleGroup>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">프로필 페이지의 최근 게시물(~12개)과 프로필 정보를 함께 수집합니다.</p>
              )}
              {balance !== null && (
                <p className="text-xs text-muted-foreground">잔액: ${balance.toFixed(2)}</p>
              )}
            </div>
          )}

          {collectStatus === 'loading' && (
            <div className="py-8 text-center">
              <div className="text-sm text-muted-foreground animate-pulse">수집 진행 중...</div>
              <p className="text-xs text-muted-foreground mt-2">Apify에서 데이터를 가져오고 있습니다. 잠시 기다려주세요.</p>
            </div>
          )}

          {collectStatus === 'success' && (
            <div className="py-6 text-center">
              <div className="text-sm text-green-600 font-medium">{collectResult}</div>
            </div>
          )}

          {collectStatus === 'error' && (
            <div className="py-6 text-center">
              <div className="text-sm text-destructive font-medium">수집 실패</div>
              <p className="text-xs text-muted-foreground mt-1">{collectError}</p>
            </div>
          )}

          <AlertDialogFooter>
            {collectStatus === 'idle' && (
              <>
                <AlertDialogCancel>취소</AlertDialogCancel>
                <AlertDialogAction onClick={executeCollect}>수집 시작</AlertDialogAction>
              </>
            )}
            {collectStatus === 'loading' && (
              <Button disabled>수집중...</Button>
            )}
            {(collectStatus === 'success' || collectStatus === 'error') && (
              <AlertDialogAction onClick={() => { setCollectModal(null); setCollectStatus('idle') }}>확인</AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
