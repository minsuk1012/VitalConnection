'use client'

import { useState, useEffect, useCallback } from 'react'

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
      <div className="flex flex-wrap items-center gap-3 bg-white border border-gray-200 rounded-lg p-4">
        <select
          value={filterTag}
          onChange={e => { setFilterTag(e.target.value); setPage(1) }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">전체 해시태그</option>
          {searchTags.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        <input
          type="number"
          placeholder="최소 좋아요"
          value={minLikes}
          onChange={e => { setMinLikes(e.target.value); setPage(1) }}
          className="w-32 border border-gray-200 rounded-lg px-3 py-2 text-sm"
        />

        <select
          value={sortBy}
          onChange={e => { setSortBy(e.target.value); setPage(1) }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
        >
          <option value="likes">좋아요순</option>
          <option value="comments">댓글순</option>
          <option value="date">최신순</option>
        </select>

        <button
          onClick={() => setSortOrder(o => o === 'desc' ? 'asc' : 'desc')}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm hover:bg-gray-50"
        >
          {sortOrder === 'desc' ? '↓ 내림차순' : '↑ 오름차순'}
        </button>

        <div className="flex-1" />
        <span className="text-sm text-gray-500">{total}건</span>
        <button
          onClick={exportCSV}
          className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 transition"
        >
          CSV 내보내기
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 font-semibold">
              <tr>
                <th className="px-4 py-3">작성자</th>
                <th className="px-4 py-3">캡션</th>
                <th className="px-4 py-3 text-right">좋아요</th>
                <th className="px-4 py-3 text-right">댓글</th>
                <th className="px-4 py-3">태그</th>
                <th className="px-4 py-3">날짜</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">로딩중...</td></tr>
              ) : posts.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">수집된 데이터가 없습니다.</td></tr>
              ) : (
                posts.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <a href={`https://instagram.com/${p.owner_username}`} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline font-medium">
                        @{p.owner_username}
                      </a>
                    </td>
                    <td className="px-4 py-3 max-w-xs truncate text-gray-600">
                      <a href={p.url} target="_blank" rel="noopener noreferrer" className="hover:text-gray-900">
                        {(p.caption || '').slice(0, 80)}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{p.likes.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">{p.comments.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className="bg-purple-50 text-purple-600 px-2 py-0.5 rounded text-xs">{p.search_tag}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {p.post_timestamp ? new Date(p.post_timestamp).toLocaleDateString('ko-KR') : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 border border-gray-200 rounded text-sm disabled:opacity-30"
          >
            이전
          </button>
          <span className="px-3 py-1 text-sm text-gray-600">{page} / {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 border border-gray-200 rounded text-sm disabled:opacity-30"
          >
            다음
          </button>
        </div>
      )}
    </div>
  )
}
