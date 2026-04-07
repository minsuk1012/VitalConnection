'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

const TYPE_LABELS: Record<string, string> = {
  hashtag: '해시태그',
  keyword: '키워드',
  profile: '계정',
  location: '위치',
  reel: '릴스',
  profiles: '프로필',
}

type CollectionRecord = {
  id: number
  type: string
  query: string
  status: string
  totalCollected: number
  createdAt: string
}

export default function CollectTab() {
  const [history, setHistory] = useState<CollectionRecord[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch('/api/instagram/collections')
      .then(r => r.json())
      .then(d => setHistory(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const totalCollected = history.reduce((s, h) => s + (h.totalCollected || 0), 0)
  const completedCount = history.filter(h => h.status === 'completed').length

  return (
    <div className="space-y-4">
      {/* 요약 */}
      <div className="flex gap-4">
        <Card className="flex-1">
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground">전체 수집</div>
            <div className="text-2xl font-bold">{history.length}건</div>
          </CardContent>
        </Card>
        <Card className="flex-1">
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground">성공</div>
            <div className="text-2xl font-bold text-green-600">{completedCount}건</div>
          </CardContent>
        </Card>
        <Card className="flex-1">
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground">총 수집 데이터</div>
            <div className="text-2xl font-bold">{totalCollected.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* 이력 테이블 */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>시간</TableHead>
                <TableHead>유형</TableHead>
                <TableHead>검색어</TableHead>
                <TableHead className="text-right">건수</TableHead>
                <TableHead>상태</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">로딩중...</TableCell>
                </TableRow>
              ) : history.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">수집 이력이 없습니다.</TableCell>
                </TableRow>
              ) : (
                history.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(item.createdAt).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">{TYPE_LABELS[item.type] || item.type}</Badge>
                    </TableCell>
                    <TableCell className="text-sm truncate max-w-[250px]">{item.query}</TableCell>
                    <TableCell className="text-sm text-right">{item.totalCollected}</TableCell>
                    <TableCell className={cn(
                      'text-sm',
                      item.status === 'completed' && 'text-green-600',
                      item.status === 'failed' && 'text-destructive',
                      item.status === 'running' && 'text-primary',
                    )}>
                      {item.status === 'completed' ? '완료' :
                       item.status === 'failed' ? '실패' :
                       item.status === 'running' ? '수집중' : item.status}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
