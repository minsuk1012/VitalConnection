'use client'

import { useState, useEffect, Fragment } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet'

interface ReelGroup {
  username: string
  reelCount: number
  avgViews: number
  avgPlays: number
  avgLikes: number
  totalViews: number
  lastCollected: string
}

interface ReelComment {
  id: number
  commentText: string
  commenterUsername: string
  likes: number
  isReply: number
  detectedLanguage: string
  commentTimestamp: string
}

export default function ReelsExploreTab() {
  const [groups, setGroups] = useState<ReelGroup[]>([])
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [reelsByUser, setReelsByUser] = useState<Record<string, any[]>>({})

  const [refreshing, setRefreshing] = useState<string | null>(null)

  // 수집 state
  const [collectUsername, setCollectUsername] = useState('')
  const [collectLimit, setCollectLimit] = useState(10)
  const [isCollecting, setIsCollecting] = useState(false)

  // Sheet state
  const [selectedReel, setSelectedReel] = useState<any | null>(null)
  const [comments, setComments] = useState<ReelComment[]>([])
  const [loadingComments, setLoadingComments] = useState(false)

  async function fetchGroups() {
    setLoading(true)
    const res = await fetch('/api/instagram/reels?grouped=true')
    const data = await res.json()
    setGroups(data.groups || [])
    setLoading(false)
  }

  useEffect(() => { fetchGroups() }, [])

  async function startCollect() {
    const username = collectUsername.trim().replace(/^@/, '')
    if (!username || isCollecting) return
    setIsCollecting(true)
    try {
      const res = await fetch('/api/instagram/collect-reels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, limit: collectLimit }),
      })
      if (res.ok) {
        setCollectUsername('')
        await fetchGroups()
        // 자동 확장
        setReelsByUser(prev => { const next = { ...prev }; delete next[username]; return next })
        setExpanded(username)
        const reelRes = await fetch(`/api/instagram/reels?username=${username}`)
        const reelData = await reelRes.json()
        setReelsByUser(prev => ({ ...prev, [username]: reelData.reels || [] }))
      }
    } catch {}
    setIsCollecting(false)
  }

  async function toggleExpand(username: string) {
    if (expanded === username) {
      setExpanded(null)
      return
    }
    setExpanded(username)
    if (!reelsByUser[username]) {
      const res = await fetch(`/api/instagram/reels?username=${username}`)
      const data = await res.json()
      setReelsByUser(prev => ({ ...prev, [username]: data.reels || [] }))
    }
  }

  async function refreshUser(username: string, limit: number) {
    setRefreshing(username)
    try {
      await fetch('/api/instagram/reels/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, limit }),
      })
      // 캐시 무효화 후 새로고침
      setReelsByUser(prev => { const next = { ...prev }; delete next[username]; return next })
      await fetchGroups()
      if (expanded === username) {
        const res = await fetch(`/api/instagram/reels?username=${username}`)
        const data = await res.json()
        setReelsByUser(prev => ({ ...prev, [username]: data.reels || [] }))
      }
    } catch {}
    setRefreshing(null)
  }

  async function openReel(reel: any) {
    setSelectedReel(reel)
    setComments([])
    setLoadingComments(true)
    try {
      const res = await fetch(`/api/instagram/reels?reelId=${reel.id}`)
      const data = await res.json()
      setComments(data.comments || [])
    } catch {}
    setLoadingComments(false)
  }

  return (
    <div className="space-y-4">
      {/* 수집 */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 pt-6">
          <Input
            placeholder="@username 입력 후 Enter..."
            value={collectUsername}
            onChange={e => setCollectUsername(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') startCollect() }}
            disabled={isCollecting}
            className="flex-1 min-w-[200px]"
          />
          <div className="flex gap-1">
            {[10, 20, 50].map(n => (
              <button
                key={n}
                onClick={() => setCollectLimit(n)}
                className={`px-2 py-1 rounded-md text-xs transition-colors ${collectLimit === n ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}
              >
                {n}개
              </button>
            ))}
          </div>
          <Button onClick={startCollect} disabled={!collectUsername.trim() || isCollecting} size="sm">
            {isCollecting ? '수집중...' : '릴스 수집'}
          </Button>
          <span className="text-sm text-muted-foreground">{groups.length}개 계정 · {groups.reduce((s, g) => s + g.reelCount, 0)}개 릴스</span>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>계정</TableHead>
                <TableHead className="text-right">릴스 수</TableHead>
                <TableHead className="text-right">평균 조회</TableHead>
                <TableHead className="text-right">평균 재생</TableHead>
                <TableHead className="text-right">평균 좋아요</TableHead>
                <TableHead>수집일</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">로딩중...</TableCell>
                </TableRow>
              ) : groups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">릴스 데이터가 없습니다. 수집 페이지에서 릴스를 수집하세요.</TableCell>
                </TableRow>
              ) : (
                groups.map(g => (
                  <Fragment key={g.username}>
                    <TableRow onClick={() => toggleExpand(g.username)} className="cursor-pointer">
                      <TableCell>
                        <a href={`https://instagram.com/${g.username}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium" onClick={e => e.stopPropagation()}>
                          @{g.username}
                        </a>
                      </TableCell>
                      <TableCell className="text-right font-medium">{g.reelCount}</TableCell>
                      <TableCell className="text-right">{(g.avgViews || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right">{(g.avgPlays || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right">{g.avgLikes > 0 ? g.avgLikes.toLocaleString() : '-'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {g.lastCollected ? new Date(g.lastCollected).toLocaleDateString('ko-KR') : '-'}
                      </TableCell>
                      <TableCell onClick={e => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => refreshUser(g.username, 20)}
                          disabled={refreshing === g.username}
                          className="text-xs"
                        >
                          {refreshing === g.username ? '최신화중...' : '최신화'}
                        </Button>
                      </TableCell>
                    </TableRow>
                    {expanded === g.username && (
                      <TableRow>
                        <TableCell colSpan={7} className="bg-muted/50 p-0">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-xs pl-8">캡션</TableHead>
                                <TableHead className="text-xs text-right">조회수</TableHead>
                                <TableHead className="text-xs text-right">재생수</TableHead>
                                <TableHead className="text-xs text-right">좋아요</TableHead>
                                <TableHead className="text-xs text-right">댓글</TableHead>
                                <TableHead className="text-xs">길이</TableHead>
                                <TableHead className="text-xs">날짜</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {(reelsByUser[g.username] || []).map((r: any) => (
                                <TableRow key={r.id} onClick={() => openReel(r)} className="cursor-pointer hover:bg-muted">
                                  <TableCell className="pl-8 max-w-[200px] truncate text-xs">
                                    {(r.caption || '').slice(0, 60)}
                                  </TableCell>
                                  <TableCell className="text-right text-xs font-medium">{(r.views || 0).toLocaleString()}</TableCell>
                                  <TableCell className="text-right text-xs">{(r.plays || 0).toLocaleString()}</TableCell>
                                  <TableCell className="text-right text-xs">{r.likes > 0 ? r.likes.toLocaleString() : '-'}</TableCell>
                                  <TableCell className="text-right text-xs">{(r.commentsCount || 0).toLocaleString()}</TableCell>
                                  <TableCell className="text-xs text-muted-foreground">{r.duration ? `${Math.round(r.duration)}초` : '-'}</TableCell>
                                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                    {r.postTimestamp ? new Date(r.postTimestamp).toLocaleDateString('ko-KR') : '-'}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
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

      {/* 릴스 상세 Sheet */}
      <Sheet open={!!selectedReel} onOpenChange={open => { if (!open) setSelectedReel(null) }}>
        <SheetContent side="right" className="overflow-y-auto sm:max-w-md">
          {selectedReel && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <a href={`https://instagram.com/${selectedReel.username}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    @{selectedReel.username}
                  </a>
                  {selectedReel.ownerFullname && (
                    <span className="text-sm font-normal text-muted-foreground">{selectedReel.ownerFullname}</span>
                  )}
                </SheetTitle>
                <SheetDescription>
                  {selectedReel.postTimestamp ? new Date(selectedReel.postTimestamp).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }) : ''}
                </SheetDescription>
              </SheetHeader>

              <div className="flex-1 px-4 space-y-5 pb-8">
                {/* 동영상 미리보기 */}
                {selectedReel.videoUrl ? (
                  <div className="rounded-lg overflow-hidden bg-black aspect-[9/16] max-h-[360px]">
                    <video
                      src={selectedReel.videoUrl}
                      controls
                      playsInline
                      preload="metadata"
                      poster={selectedReel.displayUrl || undefined}
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : selectedReel.displayUrl ? (
                  <div className="rounded-lg overflow-hidden">
                    <img src={selectedReel.displayUrl} alt="" className="w-full object-cover rounded-lg" loading="lazy" />
                  </div>
                ) : null}

                {/* 통계 */}
                <div className="grid grid-cols-4 gap-2 text-center rounded-lg bg-muted/50 py-3">
                  <div>
                    <div className="text-base font-semibold">{(selectedReel.views || 0).toLocaleString()}</div>
                    <div className="text-[11px] text-muted-foreground">조회수</div>
                  </div>
                  <div>
                    <div className="text-base font-semibold">{(selectedReel.plays || 0).toLocaleString()}</div>
                    <div className="text-[11px] text-muted-foreground">재생수</div>
                  </div>
                  <div>
                    <div className="text-base font-semibold">{selectedReel.likes > 0 ? selectedReel.likes.toLocaleString() : '-'}</div>
                    <div className="text-[11px] text-muted-foreground">좋아요</div>
                  </div>
                  <div>
                    <div className="text-base font-semibold">{(selectedReel.commentsCount || 0).toLocaleString()}</div>
                    <div className="text-[11px] text-muted-foreground">댓글</div>
                  </div>
                </div>

                {/* 메타 뱃지 */}
                <div className="flex flex-wrap items-center gap-2">
                  {selectedReel.duration > 0 && (
                    <Badge variant="secondary">{Math.round(selectedReel.duration)}초</Badge>
                  )}
                  {selectedReel.audioTitle && (
                    <Badge variant="secondary">♪ {selectedReel.audioTitle}</Badge>
                  )}
                  <a href={selectedReel.reelUrl} target="_blank" rel="noopener noreferrer" className="ml-auto text-xs text-primary hover:underline">
                    인스타그램에서 보기 →
                  </a>
                </div>

                {/* 캡션 */}
                {selectedReel.caption && (
                  <div className="text-sm leading-relaxed whitespace-pre-line">
                    {selectedReel.caption.length > 200
                      ? selectedReel.caption.slice(0, 200) + '...'
                      : selectedReel.caption}
                  </div>
                )}

                {/* 해시태그 */}
                {(() => {
                  try {
                    const tags = JSON.parse(selectedReel.hashtags || '[]')
                    return tags.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {tags.map((t: string) => (
                          <Badge key={t} variant="secondary" className="text-xs">#{t}</Badge>
                        ))}
                      </div>
                    ) : null
                  } catch { return null }
                })()}

                {/* 댓글 */}
                <div className="border-t pt-4">
                  <div className="text-sm font-medium mb-3">댓글 {comments.length > 0 ? `(${comments.length})` : ''}</div>
                  {loadingComments ? (
                    <p className="text-xs text-muted-foreground py-2">댓글 로딩중...</p>
                  ) : comments.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2">수집된 댓글이 없습니다.</p>
                  ) : (
                    <div className="space-y-4">
                      {comments.map(c => (
                        <div key={c.id}>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{c.commenterUsername || '익명'}</span>
                            {c.detectedLanguage && (
                              <Badge variant="secondary" className="text-[10px] px-1 py-0">{c.detectedLanguage}</Badge>
                            )}
                            {c.isReply === 1 && (
                              <Badge variant="outline" className="text-[10px] px-1 py-0">답글</Badge>
                            )}
                          </div>
                          <p className="text-sm mt-1 leading-relaxed">{c.commentText}</p>
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                            {c.likes > 0 && <span>좋아요 {c.likes}</span>}
                            {c.commentTimestamp && <span>{new Date(c.commentTimestamp).toLocaleDateString('ko-KR')}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
