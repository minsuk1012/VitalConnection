'use client'

import { useState, useEffect, Fragment } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet'

function CaptionText({ text, limit = 150 }: { text: string; limit?: number }) {
  const [expanded, setExpanded] = useState(false)
  const needsTruncate = text.length > limit

  return (
    <div className="text-sm leading-relaxed whitespace-pre-line">
      {needsTruncate && !expanded ? text.slice(0, limit) + '...' : text}
      {needsTruncate && (
        <button onClick={() => setExpanded(!expanded)} className="text-muted-foreground hover:text-foreground ml-1 text-xs">
          {expanded ? '접기' : '더보기'}
        </button>
      )}
    </div>
  )
}

function ImageCarousel({ images }: { images: string[] }) {
  const [current, setCurrent] = useState(0)
  if (images.length === 0) return null

  return (
    <div className="relative rounded-lg overflow-hidden">
      <img src={images[current]} alt="" className="w-full object-cover" loading="lazy" />
      {images.length > 1 && (
        <>
          {/* 인디케이터 */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${i === current ? 'bg-white' : 'bg-white/40'}`}
              />
            ))}
          </div>
          {/* 좌우 버튼 */}
          {current > 0 && (
            <button onClick={() => setCurrent(current - 1)} className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center text-sm">
              ‹
            </button>
          )}
          {current < images.length - 1 && (
            <button onClick={() => setCurrent(current + 1)} className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center text-sm">
              ›
            </button>
          )}
          {/* 카운터 */}
          <div className="absolute top-3 right-3 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">
            {current + 1}/{images.length}
          </div>
        </>
      )}
    </div>
  )
}

interface PostGroup {
  searchTag: string
  postCount: number
  avgLikes: number
  avgComments: number
  totalLikes: number
  lastCollected: string
}

interface ProfileData {
  bio: string
  followers: number
  following: number
  isBusiness: number
  fullname: string
}

export default function ExploreTab() {
  const [groups, setGroups] = useState<PostGroup[]>([])
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [postsByTag, setPostsByTag] = useState<Record<string, any[]>>({})
  const [searchText, setSearchText] = useState('')

  // 수집 state
  const [collectQuery, setCollectQuery] = useState('')
  const [collectLimit, setCollectLimit] = useState(30)
  const [isCollecting, setIsCollecting] = useState(false)

  // Sheet state
  const [selectedPost, setSelectedPost] = useState<any | null>(null)

  // Profile analysis
  const [analyzing, setAnalyzing] = useState<string | null>(null)
  const [profileData, setProfileData] = useState<Record<string, ProfileData>>({})


  async function fetchGroups() {
    setLoading(true)
    const res = await fetch('/api/instagram/results?grouped=true')
    const data = await res.json()
    setGroups(data.groups || [])
    setLoading(false)
  }

  useEffect(() => { fetchGroups() }, [])

  async function startCollect() {
    if (!collectQuery.trim() || isCollecting) return
    setIsCollecting(true)
    try {
      const res = await fetch('/api/instagram/collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'hashtag', query: collectQuery.trim(), limit: collectLimit }),
      })
      const data = await res.json()
      if (res.ok) {
        setCollectQuery('')
        // 새로고침 + 해당 태그 자동 확장
        await fetchGroups()
        setPostsByTag(prev => { const next = { ...prev }; delete next[collectQuery.trim()]; return next })
        setExpanded(collectQuery.trim())
        // 확장된 태그의 게시물 로드
        const tagRes = await fetch(`/api/instagram/results?searchTag=${encodeURIComponent(collectQuery.trim())}`)
        const tagData = await tagRes.json()
        setPostsByTag(prev => ({ ...prev, [collectQuery.trim()]: tagData.posts || [] }))
      }
    } catch {}
    setIsCollecting(false)
  }

  async function toggleExpand(tag: string) {
    if (expanded === tag) {
      setExpanded(null)
      return
    }
    setExpanded(tag)
    if (!postsByTag[tag]) {
      const res = await fetch(`/api/instagram/results?searchTag=${encodeURIComponent(tag)}`)
      const data = await res.json()
      setPostsByTag(prev => ({ ...prev, [tag]: data.posts || [] }))
    }
  }

  async function analyzeProfile(username: string) {
    setAnalyzing(username)
    try {
      const res = await fetch('/api/instagram/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      })
      const data = await res.json()
      if (data.profile) {
        setProfileData(prev => ({ ...prev, [username]: data.profile }))
      }
    } catch {}
    setAnalyzing(null)
  }

  // 검색 필터
  const filteredGroups = searchText
    ? groups.filter(g => g.searchTag.toLowerCase().includes(searchText.toLowerCase()))
    : groups

  const totalPosts = groups.reduce((s, g) => s + g.postCount, 0)

  return (
    <div className="space-y-4">
      {/* 수집 */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 pt-6">
          <Input
            placeholder="해시태그 입력 후 Enter..."
            value={collectQuery}
            onChange={e => setCollectQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') startCollect() }}
            disabled={isCollecting}
            className="flex-1 min-w-[200px]"
          />
          <Input
            type="number"
            value={collectLimit}
            onChange={e => setCollectLimit(Number(e.target.value))}
            min={1} max={100}
            disabled={isCollecting}
            className="w-16"
          />
          <Button onClick={startCollect} disabled={!collectQuery.trim() || isCollecting} size="sm">
            {isCollecting ? '수집중...' : '수집'}
          </Button>
        </CardContent>
      </Card>

      {/* 필터 + 통계 */}
      <Card>
        <CardContent className="flex items-center gap-3 pt-6">
          <Input
            placeholder="검색어 필터..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            className="flex-1"
          />
          <span className="text-sm text-muted-foreground whitespace-nowrap">{filteredGroups.length}개 검색어 · {totalPosts}개 게시물</span>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>검색어</TableHead>
                <TableHead className="text-right">게시물</TableHead>
                <TableHead className="text-right">평균 좋아요</TableHead>
                <TableHead className="text-right">평균 댓글</TableHead>
                <TableHead className="text-right">총 좋아요</TableHead>
                <TableHead>수집일</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">로딩중...</TableCell>
                </TableRow>
              ) : filteredGroups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">수집된 게시물이 없습니다. 수집 페이지에서 데이터를 수집하세요.</TableCell>
                </TableRow>
              ) : (
                filteredGroups.map(g => (
                  <Fragment key={g.searchTag}>
                    <TableRow onClick={() => toggleExpand(g.searchTag)} className="cursor-pointer">
                      <TableCell className="font-medium">{g.searchTag}</TableCell>
                      <TableCell className="text-right font-medium">{g.postCount}</TableCell>
                      <TableCell className="text-right">{(g.avgLikes || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right">{(g.avgComments || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right">{(g.totalLikes || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {g.lastCollected ? new Date(g.lastCollected).toLocaleDateString('ko-KR') : '-'}
                      </TableCell>
                    </TableRow>
                    {expanded === g.searchTag && (
                      <TableRow>
                        <TableCell colSpan={6} className="bg-muted/50 p-0">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-xs pl-8">작성자</TableHead>
                                <TableHead className="text-xs">캡션</TableHead>
                                <TableHead className="text-xs text-right">좋아요</TableHead>
                                <TableHead className="text-xs text-right">댓글</TableHead>
                                <TableHead className="text-xs">날짜</TableHead>
                                <TableHead className="text-xs w-16"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {(postsByTag[g.searchTag] || []).map((p: any) => (
                                <TableRow key={p.id} onClick={() => setSelectedPost(p)} className="cursor-pointer hover:bg-muted">
                                  <TableCell className="text-xs pl-8">
                                    <a href={`https://instagram.com/${p.owner_username}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium" onClick={e => e.stopPropagation()}>
                                      @{p.owner_username}
                                    </a>
                                  </TableCell>
                                  <TableCell className="text-xs max-w-[200px] truncate text-muted-foreground">
                                    {(p.caption || '').slice(0, 60)}
                                  </TableCell>
                                  <TableCell className="text-xs text-right font-medium">{(p.likes || 0).toLocaleString()}</TableCell>
                                  <TableCell className="text-xs text-right">{(p.comments || 0).toLocaleString()}</TableCell>
                                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                    {p.post_timestamp ? new Date(p.post_timestamp).toLocaleDateString('ko-KR') : '-'}
                                  </TableCell>
                                  <TableCell className="text-xs" onClick={e => e.stopPropagation()}>
                                    <Button
                                      variant="ghost"
                                      size="xs"
                                      onClick={() => analyzeProfile(p.owner_username)}
                                      disabled={analyzing === p.owner_username}
                                    >
                                      {analyzing === p.owner_username ? '...' : profileData[p.owner_username] ? '완료' : '분석'}
                                    </Button>
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

      {/* 게시물 상세 Sheet */}
      <Sheet open={!!selectedPost} onOpenChange={open => { if (!open) setSelectedPost(null) }}>
        <SheetContent side="right" className="overflow-y-auto sm:max-w-md">
          {selectedPost && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <a href={`https://instagram.com/${selectedPost.owner_username}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    @{selectedPost.owner_username}
                  </a>
                  {selectedPost.owner_fullname && (
                    <span className="text-sm font-normal text-muted-foreground">{selectedPost.owner_fullname}</span>
                  )}
                </SheetTitle>
                <SheetDescription>
                  {selectedPost.post_timestamp ? new Date(selectedPost.post_timestamp).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }) : ''}
                </SheetDescription>
              </SheetHeader>

              <div className="flex-1 px-4 space-y-5 pb-8">
                {/* 이미지 캐러셀 */}
                {(() => {
                  let allImages: string[] = []
                  try { allImages = JSON.parse(selectedPost.images || '[]') } catch {}
                  if (allImages.length === 0 && selectedPost.display_url) allImages = [selectedPost.display_url]
                  if (allImages.length === 0) return null

                  return <ImageCarousel images={allImages} />
                })()}

                {/* 통계 */}
                <div className="grid grid-cols-3 gap-2 text-center rounded-lg bg-muted/50 py-3">
                  <div>
                    <div className="text-base font-semibold">{(selectedPost.likes || 0).toLocaleString()}</div>
                    <div className="text-[11px] text-muted-foreground">좋아요</div>
                  </div>
                  <div>
                    <div className="text-base font-semibold">{(selectedPost.comments || 0).toLocaleString()}</div>
                    <div className="text-[11px] text-muted-foreground">댓글</div>
                  </div>
                  <div>
                    <div className="text-base font-semibold">
                      {selectedPost.is_video === 1 && selectedPost.video_view_count > 0
                        ? selectedPost.video_view_count.toLocaleString()
                        : '-'}
                    </div>
                    <div className="text-[11px] text-muted-foreground">조회수</div>
                  </div>
                </div>

                {/* 메타 뱃지 */}
                <div className="flex flex-wrap items-center gap-2">
                  {selectedPost.post_type && (
                    <Badge variant="secondary">{selectedPost.post_type}</Badge>
                  )}
                  {selectedPost.location && (
                    <Badge variant="secondary">{selectedPost.location}</Badge>
                  )}
                  <a href={selectedPost.url} target="_blank" rel="noopener noreferrer" className="ml-auto text-xs text-primary hover:underline">
                    인스타그램에서 보기 →
                  </a>
                </div>

                {/* 캡션 */}
                {selectedPost.caption && <CaptionText text={selectedPost.caption} />}

                {/* 해시태그 */}
                {(() => {
                  try {
                    const tags = JSON.parse(selectedPost.hashtags || '[]')
                    return tags.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {tags.map((t: string) => (
                          <Badge key={t} variant="secondary" className="text-xs">#{t}</Badge>
                        ))}
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
                      <div className="border-t pt-4">
                        <div className="text-sm font-medium mb-3">댓글 ({comments.length})</div>
                        <div className="space-y-3">
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

                {/* 프로필 분석 결과 */}
                {profileData[selectedPost.owner_username] && (
                  <div className="border-t pt-4">
                    <div className="text-sm font-medium mb-2">프로필 정보</div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-xs text-muted-foreground">팔로워</div>
                        <div className="font-medium">{profileData[selectedPost.owner_username].followers.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">팔로잉</div>
                        <div className="font-medium">{profileData[selectedPost.owner_username].following.toLocaleString()}</div>
                      </div>
                    </div>
                    {profileData[selectedPost.owner_username].bio && (
                      <p className="text-sm mt-2">{profileData[selectedPost.owner_username].bio}</p>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
