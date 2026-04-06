'use client'

import { useState, useEffect, useCallback, Fragment } from 'react'

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
  const [sortBy, setSortBy] = useState('')
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    params.set('page', String(page))
    if (sortBy) params.set('sortBy', sortBy)

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
      <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg p-4">
        <select
          value={sortBy}
          onChange={e => { setSortBy(e.target.value); setPage(1) }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">Engagement순</option>
          <option value="likes">평균 좋아요순</option>
          <option value="comments">평균 댓글순</option>
          <option value="posts">게시물 수순</option>
        </select>

        <div className="flex-1" />
        <span className="text-sm text-gray-500">{total}명</span>
        <button
          onClick={exportCSV}
          className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 transition"
        >
          CSV 내보내기
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-600 font-semibold">
            <tr>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">계정</th>
              <th className="px-4 py-3 text-right">게시물</th>
              <th className="px-4 py-3 text-right">평균 좋아요</th>
              <th className="px-4 py-3 text-right">평균 댓글</th>
              <th className="px-4 py-3 text-right">Engagement</th>
              <th className="px-4 py-3">해시태그</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">로딩중...</td></tr>
            ) : influencers.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">인플루언서 데이터가 없습니다.</td></tr>
            ) : (
              influencers.map((inf, idx) => (
                <Fragment key={inf.username}>
                  <tr
                    onClick={() => setExpanded(expanded === inf.username ? null : inf.username)}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-4 py-3 text-gray-400">{(page - 1) * 50 + idx + 1}</td>
                    <td className="px-4 py-3">
                      <a href={inf.profile_url} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline font-medium"
                         onClick={e => e.stopPropagation()}>
                        @{inf.username}
                      </a>
                      {inf.fullname && <div className="text-xs text-gray-400">{inf.fullname}</div>}
                    </td>
                    <td className="px-4 py-3 text-right">{inf.post_count}</td>
                    <td className="px-4 py-3 text-right">{inf.avg_likes.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">{inf.avg_comments.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-bold text-purple-600">{inf.avg_engagement.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {inf.hashtags.slice(0, 3).map(h => (
                          <span key={h} className="bg-purple-50 text-purple-600 px-2 py-0.5 rounded text-xs">#{h}</span>
                        ))}
                        {inf.hashtags.length > 3 && (
                          <span className="text-gray-400 text-xs">+{inf.hashtags.length - 3}</span>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expanded === inf.username && inf.samplePosts.length > 0 && (
                    <tr>
                      <td colSpan={7} className="px-8 py-3 bg-gray-50">
                        <div className="text-xs font-semibold text-gray-500 mb-2">샘플 게시물 (상위 {inf.samplePosts.length}개)</div>
                        <div className="space-y-2">
                          {inf.samplePosts.map((post, i) => (
                            <div key={i} className="flex items-center gap-3 text-xs">
                              <a href={post.url} target="_blank" rel="noopener noreferrer" className="text-purple-500 hover:underline truncate max-w-xs">
                                {(post.caption || '').slice(0, 60) || post.url}
                              </a>
                              <span className="text-gray-400">❤️ {post.likes}</span>
                              <span className="text-gray-400">💬 {post.comments}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
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
