'use client'

import { useState, useEffect, useCallback } from 'react'
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
  hashtags: string
  search_tag: string
  location: string
}

export default function ResultsTab() {
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

          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortOrder(o => o === 'desc' ? 'asc' : 'desc')}
          >
            {sortOrder === 'desc' ? '내림차순' : '오름차순'}
          </Button>

          <div className="flex-1" />
          <span className="text-sm text-muted-foreground">{total}건</span>
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
                <TableHead>작성자</TableHead>
                <TableHead>캡션</TableHead>
                <TableHead className="text-right">좋아요</TableHead>
                <TableHead className="text-right">댓글</TableHead>
                <TableHead>태그</TableHead>
                <TableHead>날짜</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">로딩중...</TableCell>
                </TableRow>
              ) : posts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">수집된 데이터가 없습니다.</TableCell>
                </TableRow>
              ) : (
                posts.map(p => (
                  <TableRow key={p.id}>
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
