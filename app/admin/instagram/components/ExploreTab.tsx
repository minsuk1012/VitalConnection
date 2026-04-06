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

interface Post {
  id: number
  owner_username: string
  owner_fullname: string
  url: string
  caption: string
  likes: number
  comments: number
  post_timestamp: string
  search_tag: string
}

interface ProfileData {
  bio: string
  followers: number
  following: number
  is_business: number
  fullname: string
  post_count: number
  avg_likes: number
  avg_comments: number
  avg_engagement: number
}

export default function ExploreTab() {
  const [posts, setPosts] = useState<Post[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [searchTags, setSearchTags] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const [filterTag, setFilterTag] = useState('')
  const [minLikes, setMinLikes] = useState('')
  const [sortBy, setSortBy] = useState('likes')
  const [sortOrder, setSortOrder] = useState('desc')

  // Profile analysis state
  const [analyzing, setAnalyzing] = useState<string | null>(null)
  const [expandedProfile, setExpandedProfile] = useState<string | null>(null)
  const [profileData, setProfileData] = useState<Record<string, ProfileData>>({})

  const fetchResults = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('sortBy', sortBy)
    params.set('sortOrder', sortOrder)
    if (filterTag) params.set('searchTag', filterTag)
    if (minLikes) params.set('minLikes', minLikes)

    const res = await fetch(`/api/instagram/results?${params}`)
    const data = await res.json()

    setPosts(data.rows || [])
    setTotal(data.total || 0)
    setTotalPages(data.totalPages || 0)
    setSearchTags(data.searchTags || [])
    setLoading(false)
  }, [page, sortBy, sortOrder, filterTag, minLikes])

  useEffect(() => { fetchResults() }, [fetchResults])

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
        setExpandedProfile(username)
      }
    } catch {}
    setAnalyzing(null)
  }

  function toggleProfile(username: string) {
    if (expandedProfile === username) {
      setExpandedProfile(null)
    } else if (profileData[username]) {
      setExpandedProfile(username)
    } else {
      analyzeProfile(username)
    }
  }

  function exportCSV() {
    const params = new URLSearchParams()
    if (filterTag) params.set('searchTag', filterTag)
    if (minLikes) params.set('minLikes', minLikes)
    window.open(`/api/instagram/results/export?${params}`)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 pt-6">
          <Select value={filterTag} onValueChange={v => { setFilterTag(v === 'all' ? '' : v); setPage(1) }}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="전체 해시태그" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 해시태그</SelectItem>
              {searchTags.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>

          <Input
            type="number"
            placeholder="최소 좋아요"
            value={minLikes}
            onChange={e => { setMinLikes(e.target.value); setPage(1) }}
            className="w-32"
          />

          <Select value={sortBy} onValueChange={v => { setSortBy(v); setPage(1) }}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="likes">좋아요순</SelectItem>
              <SelectItem value="comments">댓글순</SelectItem>
              <SelectItem value="date">최신순</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={() => setSortOrder(o => o === 'desc' ? 'asc' : 'desc')}>
            {sortOrder === 'desc' ? '내림차순' : '오름차순'}
          </Button>

          <div className="flex-1" />
          <span className="text-sm text-muted-foreground">{total}건</span>
          <Button variant="outline" size="sm" onClick={exportCSV}>CSV 내보내기</Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>작성자</TableHead>
                <TableHead>캡션</TableHead>
                <TableHead className="text-right">좋아요</TableHead>
                <TableHead className="text-right">댓글</TableHead>
                <TableHead>태그</TableHead>
                <TableHead>날짜</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">로딩중...</TableCell>
                </TableRow>
              ) : posts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">수집된 데이터가 없습니다. 먼저 수집 페이지에서 데이터를 수집하세요.</TableCell>
                </TableRow>
              ) : (
                posts.map(p => (
                  <Fragment key={p.id}>
                    <TableRow>
                      <TableCell>
                        <a href={`https://instagram.com/${p.owner_username}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">
                          @{p.owner_username}
                        </a>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        <a href={p.url} target="_blank" rel="noopener noreferrer" className="hover:text-foreground text-muted-foreground">
                          {(p.caption || '').slice(0, 80)}
                        </a>
                      </TableCell>
                      <TableCell className="text-right font-medium">{p.likes.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{p.comments.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{p.search_tag}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                        {p.post_timestamp ? new Date(p.post_timestamp).toLocaleDateString('ko-KR') : '-'}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => toggleProfile(p.owner_username)}
                          disabled={analyzing === p.owner_username}
                        >
                          {analyzing === p.owner_username ? '분석중...' : expandedProfile === p.owner_username ? '접기' : '분석'}
                        </Button>
                      </TableCell>
                    </TableRow>
                    {expandedProfile === p.owner_username && profileData[p.owner_username] && (
                      <TableRow>
                        <TableCell colSpan={7} className="bg-muted/50 px-8 py-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <div className="text-muted-foreground text-xs">이름</div>
                              <div className="font-medium">{profileData[p.owner_username].fullname || '-'}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground text-xs">팔로워</div>
                              <div className="font-medium">{profileData[p.owner_username].followers.toLocaleString()}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground text-xs">팔로잉</div>
                              <div className="font-medium">{profileData[p.owner_username].following.toLocaleString()}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground text-xs">평균 Engagement</div>
                              <div className="font-medium">{profileData[p.owner_username].avg_engagement.toLocaleString()}</div>
                            </div>
                            <div className="col-span-2 md:col-span-4">
                              <div className="text-muted-foreground text-xs">바이오</div>
                              <div className="text-sm">{profileData[p.owner_username].bio || '-'}</div>
                            </div>
                          </div>
                          {profileData[p.owner_username].is_business === 1 && (
                            <Badge variant="secondary" className="mt-2">비즈니스 계정</Badge>
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
